import { ref, watch, computed, type Ref } from 'vue'
import { useSupabase, generatePositionMappingKey, type Position } from '@y2kfund/core'

interface PositionMapping {
  mapping_key: string
  order_id: string
}

interface Order {
  ibOrderID: string
  symbol: string
  side: string // BUY or SELL
  totalQuantity: number
  avgFillPrice: number
  totalCost: number
  orderType: string
  secType: string // STK, OPT, etc.
  multiplier?: number
  right?: string // C or P for options
  strike?: number
  account: string
  orderDate: string
  conid?: string // ADD: Contract ID for matching with positions
}

interface OrderCalculation {
  symbol: string
  side: string
  quantity: number
  avgPrice: number
  totalCost: number
  secType: string
  right?: string
  strike?: number
  account: string
  orderDate: string
}

interface PositionOrderGroup {
  mainPosition: {
    symbol: string
    account: string
    quantity: number
  }
  orders: OrderCalculation[]
  
  // Stock purchases (assignment from puts or direct buys)
  stockPurchases: OrderCalculation[]
  stockPurchaseCost: number
  
  // Stock sales (SELL STK - reduce cost basis)
  stockSales: OrderCalculation[]
  stockSaleProceeds: number
  
  // Net stock cost (purchases - sales)
  netStockCost: number
  
  // Put sales (premium received)
  putSales: OrderCalculation[]
  putPremiumReceived: number
  
  // Put buybacks (BUY OPT P - closing positions, reduces premium)
  putBuybacks: OrderCalculation[]
  putBuybackCost: number
  
  // Call sales (covered calls - premium received)
  callSales: OrderCalculation[]
  callPremiumReceived: number
  
  // Call buybacks (BUY OPT C - closing positions, reduces premium)
  callBuybacks: OrderCalculation[]
  callBuybackCost: number
  
  // Net cash flows
  netPutCashFlow: number // Put premiums received - put buyback cost
  netCallCashFlow: number // Call premiums received - call buyback cost
  
  // Final calculations
  totalStockCost: number // DEPRECATED: same as netStockCost (for backward compatibility)
  netCost: number // Net stock cost - net put cash flow - net call cash flow
  totalShares: number
  adjustedAvgPricePerShare: number
}

export function useAverageCostPriceFromOrdersIfExitToday(
  positions: Ref<Position[] | undefined>,
  userId: string | null | undefined
) {
  const supabase = useSupabase()
  const averageCostPriceFromOrders = ref<number | null>(null)
  const totalNetCost = ref<number>(0)
  const totalShares = ref<number>(0)
  const orderGroups = ref<PositionOrderGroup[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed: Overall adjusted average price from orders
  const overallAdjustedAvgPriceFromOrders = computed(() => {
    if (orderGroups.value.length === 0) return null
    const totalNet = orderGroups.value.reduce((sum, g) => sum + g.netCost, 0)
    const totalQty = orderGroups.value.reduce((sum, g) => sum + g.totalShares, 0)
    console.log(`🔢 Calculating overall adjusted average from orders: Total Net Cost = $${totalNet}, Total Shares = ${totalQty}`)
    return totalQty > 0 ? totalNet / totalQty : null
  })

  const calculateAverageCostFromOrders = async () => {
    if (!positions.value || positions.value.length === 0 || !userId) {
      averageCostPriceFromOrders.value = null
      return
    }

    isLoading.value = true
    error.value = null

    try {
      console.log('📊 Calculating average cost price from orders for positions:', positions.value.length)

      // Step 1: Generate mapping keys for all positions
      const mappingKeys = positions.value.map(pos => 
        generatePositionMappingKey({
          internal_account_id: pos.internal_account_id,
          symbol: pos.symbol,
          contract_quantity: pos.contract_quantity ?? pos.qty,
          asset_class: pos.asset_class,
          conid: pos.conid
        })
      )

      console.log('🔑 Generated mapping keys:', mappingKeys)

      // Step 2: Fetch attached order IDs from position_order_mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .schema('hf')
        .from('position_order_mappings')
        .select('mapping_key, order_id')
        .eq('user_id', userId)
        .in('mapping_key', mappingKeys)

      if (mappingsError) {
        throw new Error(`Failed to fetch order mappings: ${mappingsError.message}`)
      }

      const mappings: PositionMapping[] = mappingsData || []
      console.log('🔗 Found order mappings:', mappings.length)

      // Step 3: Fetch orders from 'orders' table by ibOrderID
      const orderIds = [...new Set(mappings.map(m => m.order_id))] // Remove duplicates
      
      let orders: Order[] = []
      if (orderIds.length > 0) {
        console.log('📦 Fetching orders with IDs:', orderIds)
        
        const { data: ordersData, error: ordersError } = await supabase
          .schema('hf')
          .from('orders')
          .select('*')
          .in('ibOrderID', orderIds)

        if (ordersError) {
          throw new Error(`Failed to fetch orders: ${ordersError.message}`)
        }

        orders = (ordersData || []).map((order: any) => {
          const baseQuantity = parseFloat(order.quantity) || 0
          const multiplier = order.assetCategory === 'OPT' ? 100 : 1
          const totalQty = baseQuantity * multiplier
          
          return {
            ibOrderID: order.ibOrderID,
            symbol: order.symbol,
            side: order.buySell, // Use buySell from database
            totalQuantity: totalQty,
            avgFillPrice: parseFloat(order.tradePrice) || 0,
            totalCost: (parseFloat(order.tradePrice || 0) * totalQty),
            orderType: order.orderType,
            secType: order.assetCategory,
            multiplier: multiplier,
            right: order.putCall, // Use putCall from database
            strike: order.strike ? parseFloat(order.strike) : undefined,
            account: order.internal_account_id, // Use internal_account_id from database
            orderDate: order.orderDate || order.settleDateTarget || order.created_at,
            conid: order.conid, // ADD: Include conid for position matching
          }
        })

        console.log('✅ Fetched orders:', orders.length)
      }

      // Create a map of mapping_key to order IDs
      const mappingToOrders = new Map<string, string[]>()
      mappings.forEach(m => {
        if (!mappingToOrders.has(m.mapping_key)) {
          mappingToOrders.set(m.mapping_key, [])
        }
        mappingToOrders.get(m.mapping_key)!.push(m.order_id)
      })

      // Step 4: Process each position and calculate average cost from orders
      const groups: PositionOrderGroup[] = []

      for (const pos of positions.value) {
        const mappingKey = generatePositionMappingKey({
          internal_account_id: pos.internal_account_id,
          symbol: pos.symbol,
          contract_quantity: pos.contract_quantity ?? pos.qty,
          asset_class: pos.asset_class,
          conid: pos.conid
        })

        const orderIdsForPosition = mappingToOrders.get(mappingKey) || []
        const ordersForPosition = orders.filter(o => orderIdsForPosition.includes(o.ibOrderID))

        console.log(`📍 Processing position: ${pos.symbol} (${pos.legal_entity || pos.internal_account_id})`)
        console.log(`   Attached orders: ${ordersForPosition.length}`)

        // Categorize orders
        const stockPurchases: OrderCalculation[] = []
        const stockSales: OrderCalculation[] = []
        const putSales: OrderCalculation[] = []
        const putBuybacks: OrderCalculation[] = []
        const callSales: OrderCalculation[] = []
        const callBuybacks: OrderCalculation[] = []

        let stockPurchaseCost = 0
        let stockSaleProceeds = 0
        let putPremiumReceived = 0
        let putBuybackCost = 0
        let callPremiumReceived = 0
        let callBuybackCost = 0

        for (const order of ordersForPosition) {
          // totalQuantity already includes the multiplier from the mapping above
          const effectiveQuantity = order.totalQuantity
          const totalValue = order.avgFillPrice * effectiveQuantity

          const orderCalc: OrderCalculation = {
            symbol: order.symbol,
            side: order.side,
            quantity: effectiveQuantity,
            avgPrice: order.avgFillPrice,
            totalCost: totalValue,
            secType: order.secType,
            right: order.right,
            strike: order.strike,
            account: order.account,
            orderDate: order.orderDate
          }

          // Stock purchases (BUY STK or PUT assignment)
          if (order.secType === 'STK' && order.side === 'BUY') {
            stockPurchases.push(orderCalc)
            stockPurchaseCost += Math.abs(totalValue)
            console.log(`   📈 Stock purchase: ${order.symbol} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice} = $${Math.abs(totalValue).toFixed(2)}`)
          }
          // Stock sales (SELL STK - reduces cost basis)
          else if (order.secType === 'STK' && order.side === 'SELL') {
            stockSales.push(orderCalc)
            stockSaleProceeds += Math.abs(totalValue)
            console.log(`   💰 Stock sale: ${order.symbol} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice} = $${Math.abs(totalValue).toFixed(2)} (proceeds)`)
          }
          // Put sales (SELL PUT - premium received, usually negative cost)
          else if (order.secType === 'OPT' && order.right === 'P' && order.side === 'SELL') {
            putSales.push(orderCalc)
            putPremiumReceived += Math.abs(totalValue) // Premium received is positive
            console.log(`   📉 Put sale: ${order.symbol} SELL PUT @ $${order.strike} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice} = +$${Math.abs(totalValue).toFixed(2)} (premium)`)
          }
          // Put buybacks (BUY PUT - closing position, reduces premium)
          else if (order.secType === 'OPT' && order.right === 'P' && order.side === 'BUY') {
            putBuybacks.push(orderCalc)
            putBuybackCost += Math.abs(totalValue)
            console.log(`   🔙 Put buyback: ${order.symbol} BUY PUT @ $${order.strike} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice} = -$${Math.abs(totalValue).toFixed(2)} (close cost)`)
          }
          // Call sales (SELL CALL - covered call premium received)
          // FOR EXIT TODAY: Use unrealized P&L from positions table if available
          else if (order.secType === 'OPT' && order.right === 'C' && order.side === 'SELL') {
            const contractQuantity = order.totalQuantity / 100 // Convert shares to contracts
            const orderPremium = Math.abs(totalValue)
            
            console.log(`   📞 Processing Call sale (EXIT TODAY): ${order.symbol} SELL CALL @ $${order.strike}`)
            console.log(`      Order details: ${contractQuantity} contracts @ $${order.avgFillPrice} = $${orderPremium.toFixed(2)}`)
            
            // Query positions table for the most recent matching position
            let callValueToUse = orderPremium
            let valueSource = 'order-only'
            
            if (order.conid) {
              try {
                const { data: positionData, error: posError } = await supabase
                  .schema('hf')
                  .from('positions')
                  .select('id, unrealized_pnl, price, market_value')
                  .eq('internal_account_id', order.account)
                  .eq('contract_quantity', contractQuantity)
                  .eq('conid', order.conid)
                  .order('id', { ascending: false }) // Get most recent
                  .limit(1)
                  .maybeSingle()
                
                if (posError) {
                  console.warn(`      ⚠️ Error querying position: ${posError.message}`)
                } else {
                  // Enhanced validation: Check if position has valid market data
                  const isValidPosition = 
                    positionData &&
                    positionData.price !== 0 &&
                    positionData.market_value !== 0 &&
                    positionData.unrealized_pnl !== null &&
                    positionData.unrealized_pnl !== undefined
                  
                  if (isValidPosition) {
                    // Valid position with market data
                    callValueToUse = Math.abs(positionData.unrealized_pnl)
                    valueSource = 'position'
                    console.log(`      ✅ Valid position found (ID: ${positionData.id})`)
                    console.log(`      📊 Price: $${positionData.price}, Market Value: $${positionData.market_value}`)
                    console.log(`      💰 Using unrealized P&L: $${callValueToUse.toFixed(2)} (EXIT TODAY scenario)`)
                  } else if (positionData) {
                    // Position found but validation failed
                    let validationReason = ''
                    if (positionData.price === 0) {
                      validationReason = 'price is zero'
                    } else if (positionData.market_value === 0) {
                      validationReason = 'market_value is zero'
                    } else if (positionData.unrealized_pnl === null || positionData.unrealized_pnl === undefined) {
                      validationReason = 'unrealized_pnl is null/undefined'
                    }
                    
                    valueSource = 'order-fallback'
                    console.log(`      ⚠️ Position found (ID: ${positionData.id}) but invalid data`)
                    console.log(`      📊 Price: ${positionData.price}, Market Value: ${positionData.market_value}`)
                    console.log(`      📊 Unrealized P&L: ${positionData.unrealized_pnl}`)
                    console.log(`      ❌ Validation failed: ${validationReason}`)
                    console.log(`      💰 Fallback to order premium: $${callValueToUse.toFixed(2)}`)
                  } else {
                    // No position found
                    console.log(`      ℹ️ No matching position found`)
                    console.log(`      💰 Using order premium: $${callValueToUse.toFixed(2)}`)
                  }
                }
              } catch (err) {
                console.error(`      ❌ Exception querying position:`, err)
              }
            } else {
              console.log(`      ℹ️ No conid available, using order premium: $${callValueToUse.toFixed(2)}`)
            }
            
            // Create order calculation with adjusted value
            const adjustedOrderCalc: OrderCalculation = {
              symbol: order.symbol,
              side: order.side,
              quantity: effectiveQuantity,
              avgPrice: order.avgFillPrice,
              totalCost: callValueToUse, // Use adjusted value (unrealized P&L or order premium)
              secType: order.secType,
              right: order.right,
              strike: order.strike,
              account: order.account,
              orderDate: order.orderDate
            }
            
            callSales.push(adjustedOrderCalc)
            callPremiumReceived += callValueToUse
            
            console.log(`      📊 Added to call sales: $${callValueToUse.toFixed(2)} (source: ${valueSource})`)
          }
          // Call buybacks (BUY CALL - closing position, reduces premium)
          else if (order.secType === 'OPT' && order.right === 'C' && order.side === 'BUY') {
            callBuybacks.push(orderCalc)
            callBuybackCost += Math.abs(totalValue)
            console.log(`   🔙 Call buyback: ${order.symbol} BUY CALL @ $${order.strike} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice} = -$${Math.abs(totalValue).toFixed(2)} (close cost)`)
          }
          // Other orders (for logging)
          else {
            console.log(`   ❓ Other order: ${order.symbol} ${order.secType} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice}`)
          }
        }

        // Calculate net cost for this position
        // Net Stock Cost = Purchases - Sales
        const totalStockCost = stockPurchaseCost - stockSaleProceeds
        
        // Net Put Cash Flow = Premium Received - Buyback Cost
        const netPutCashFlow = putPremiumReceived - putBuybackCost
        
        // Net Call Cash Flow = Premium Received - Buyback Cost
        const netCallCashFlow = callPremiumReceived - callBuybackCost
        
        // Total Net Cost = Stock Cost - Net Put Cash Flow - Net Call Cash Flow
        const netCost = totalStockCost - netPutCashFlow - netCallCashFlow
        
        // Determine total shares: calculate from stock orders (purchases - sales)
        let positionShares = 0
        
        const stockPurchaseQuantity = stockPurchases.reduce((sum, order) => sum + Math.abs(order.quantity), 0)
        const stockSaleQuantity = stockSales.reduce((sum, order) => sum + Math.abs(order.quantity), 0)
        const netStockQuantity = stockPurchaseQuantity - stockSaleQuantity
        
        if (netStockQuantity > 0) {
          // Use net quantity from stock orders
          positionShares = netStockQuantity
          console.log(`   ✅ Using shares from stock orders: ${stockPurchaseQuantity} purchased - ${stockSaleQuantity} sold = ${positionShares}`)
        } else if (stockPurchaseQuantity > 0) {
          // Use purchase quantity only
          positionShares = stockPurchaseQuantity
          console.log(`   ✅ Using shares from stock purchases: ${positionShares}`)
        } else {
          // Fallback to position's accounting_quantity
          positionShares = pos.accounting_quantity ?? pos.qty
          console.log(`   ℹ️ No stock orders found, using position quantity: ${positionShares}`)
        }
        
        const adjustedAvgPrice = positionShares > 0 ? netCost / positionShares : 0

        console.log(`📊 Position Summary for ${pos.legal_entity || pos.internal_account_id}:`)
        console.log(`   Stock Purchase Cost: $${stockPurchaseCost.toFixed(2)}`)
        console.log(`   Stock Sale Proceeds: -$${stockSaleProceeds.toFixed(2)}`)
        console.log(`   Net Stock Cost: $${totalStockCost.toFixed(2)}`)
        console.log(`   Put Premium Received: +$${putPremiumReceived.toFixed(2)}`)
        console.log(`   Put Buyback Cost: -$${putBuybackCost.toFixed(2)}`)
        console.log(`   Net Put Cash Flow: $${netPutCashFlow.toFixed(2)}`)
        console.log(`   Call Premium Received: +$${callPremiumReceived.toFixed(2)}`)
        console.log(`   Call Buyback Cost: -$${callBuybackCost.toFixed(2)}`)
        console.log(`   Net Call Cash Flow: $${netCallCashFlow.toFixed(2)}`)
        console.log(`   Total Net Cost: $${netCost.toFixed(2)} (Net Stock - Net Put - Net Call)`)
        console.log(`   Position Shares: ${positionShares}`)
        console.log(`   Adjusted Avg Price: $${adjustedAvgPrice.toFixed(2)} per share`)

        groups.push({
          mainPosition: {
            symbol: pos.symbol,
            account: pos.legal_entity || pos.internal_account_id,
            quantity: positionShares
          },
          orders: ordersForPosition.map(o => ({
            symbol: o.symbol,
            side: o.side,
            quantity: o.totalQuantity, // Already includes multiplier
            avgPrice: o.avgFillPrice,
            totalCost: o.totalCost, // Already calculated with multiplier
            secType: o.secType,
            right: o.right,
            strike: o.strike,
            account: o.account,
            orderDate: o.orderDate
          })),
          stockPurchases,
          stockPurchaseCost,
          stockSales,
          stockSaleProceeds,
          netStockCost: totalStockCost,
          putSales,
          putPremiumReceived,
          putBuybacks,
          putBuybackCost,
          callSales,
          callPremiumReceived,
          callBuybacks,
          callBuybackCost,
          totalStockCost,
          netPutCashFlow,
          netCallCashFlow,
          netCost,
          totalShares: positionShares,
          adjustedAvgPricePerShare: adjustedAvgPrice
        })
      }

      orderGroups.value = groups

      // Calculate overall totals
      const overallNetCost = groups.reduce((sum, g) => sum + g.netCost, 0)
      const overallShares = groups.reduce((sum, g) => sum + g.totalShares, 0)
      const overallAvgPrice = overallShares > 0 ? overallNetCost / overallShares : null

      totalNetCost.value = overallNetCost
      totalShares.value = overallShares
      averageCostPriceFromOrders.value = overallAvgPrice

      if (overallAvgPrice !== null) {
        console.log(`🎯 Overall Adjusted Average from Orders: $${overallAvgPrice.toFixed(2)} per share`)
        console.log(`   Total Net Cost: $${overallNetCost.toFixed(2)}`)
        console.log(`   Total Shares: ${overallShares}`)
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to calculate average cost price from orders'
      console.error('❌ Error calculating average cost price from orders:', err)
      averageCostPriceFromOrders.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Watch positions and recalculate when they change
  watch(
    () => positions.value,
    () => {
      if (positions.value && positions.value.length > 0 && userId) {
        calculateAverageCostFromOrders()
      } else {
        averageCostPriceFromOrders.value = null
      }
    },
    { immediate: true, deep: true }
  )

  return {
    averageCostPriceFromOrders,
    overallAdjustedAvgPriceFromOrders,
    totalNetCost,
    totalShares,
    orderGroups,
    isLoading,
    error,
    refetch: calculateAverageCostFromOrders
  }
}

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
  
  // Put sales (premium received)
  putSales: OrderCalculation[]
  putPremiumReceived: number
  
  // Call sales (covered calls - premium received)
  callSales: OrderCalculation[]
  callPremiumReceived: number
  
  // Net cost calculation
  totalStockCost: number // Stock purchase cost
  totalPremiumReceived: number // Put + Call premiums
  netCost: number // Stock cost - total premiums
  totalShares: number
  adjustedAvgPricePerShare: number
}

export function useAverageCostPriceFromOrders(
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

      positions.value.forEach(pos => {
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
        const putSales: OrderCalculation[] = []
        const callSales: OrderCalculation[] = []

        let stockPurchaseCost = 0
        let putPremiumReceived = 0
        let callPremiumReceived = 0

        ordersForPosition.forEach(order => {
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
            stockPurchaseCost += totalValue
            console.log(`   📈 Stock purchase: ${order.symbol} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice} = $${totalValue.toFixed(2)}`)
          }
          // Put sales (SELL PUT - premium received, usually negative cost)
          else if (order.secType === 'OPT' && order.right === 'P' && order.side === 'SELL') {
            putSales.push(orderCalc)
            putPremiumReceived += Math.abs(totalValue) // Premium received is positive
            console.log(`   📉 Put sale: ${order.symbol} SELL PUT @ $${order.strike} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice} = +$${Math.abs(totalValue).toFixed(2)} (premium)`)
          }
          // Call sales (SELL CALL - covered call premium received)
          else if (order.secType === 'OPT' && order.right === 'C' && order.side === 'SELL') {
            callSales.push(orderCalc)
            callPremiumReceived += Math.abs(totalValue) // Premium received is positive
            console.log(`   📞 Call sale: ${order.symbol} SELL CALL @ $${order.strike} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice} = +$${Math.abs(totalValue).toFixed(2)} (premium)`)
          }
          // Other orders (for logging)
          else {
            console.log(`   ❓ Other order: ${order.symbol} ${order.secType} ${order.side} ${effectiveQuantity} @ $${order.avgFillPrice}`)
          }
        })

        // Calculate net cost for this position (stock cost minus all premiums received)
        const totalPremiumReceived = putPremiumReceived + callPremiumReceived
        const netCost = stockPurchaseCost - totalPremiumReceived
        
        // Determine total shares: use stock order quantities if available, otherwise use position quantity
        let positionShares = 0
        
        // Check if we have stock purchase orders with valid quantities
        const stockOrderQuantity = stockPurchases.reduce((sum, order) => sum + order.quantity, 0)
        
        if (stockOrderQuantity > 0) {
          // Use quantity from attached stock orders
          positionShares = stockOrderQuantity
          console.log(`   ✅ Using shares from attached stock orders: ${positionShares}`)
        } else {
          // Fallback to position's accounting_quantity
          positionShares = pos.accounting_quantity ?? pos.qty
          console.log(`   ℹ️ No stock orders found, using position quantity: ${positionShares}`)
        }
        
        const adjustedAvgPrice = positionShares > 0 ? netCost / positionShares : 0

        console.log(`📊 Position Summary for ${pos.legal_entity || pos.internal_account_id}:`)
        console.log(`   Stock Purchase Cost: -$${stockPurchaseCost.toFixed(2)}`)
        console.log(`   Put Premium Received: +$${putPremiumReceived.toFixed(2)}`)
        console.log(`   Call Premium Received: +$${callPremiumReceived.toFixed(2)}`)
        console.log(`   Total Premium Received: +$${totalPremiumReceived.toFixed(2)}`)
        console.log(`   Net Cost: $${netCost.toFixed(2)} (Stock - Put Premium - Call Premium)`)
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
          putSales,
          putPremiumReceived,
          callSales,
          callPremiumReceived,
          totalStockCost: stockPurchaseCost,
          totalPremiumReceived,
          netCost,
          totalShares: positionShares,
          adjustedAvgPricePerShare: adjustedAvgPrice
        })
      })

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

import { ref, watch, type Ref } from 'vue'
import { useSupabase } from '@y2kfund/core'

interface ExitedPnLBreakdown {
  totalMtmPnL: number
  orderCount: number
  orders: Array<{
    id: string
    symbol: string
    buySell: string
    quantity: number
    tradePrice: number
    tradeMoney: number
    mtmPnl: number
    dateTime: string
  }>
}

export function useExitedPositionsPnL(
  symbolRoot: Ref<string>,
  userId: Ref<string | null | undefined>,
  assetClass: Ref<string | null> = ref('STK')
) {
  const supabase = useSupabase()
  
  const totalExitedPnL = ref<number | null>(null)
  const exitedOrdersBreakdown = ref<ExitedPnLBreakdown | null>(null)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchExitedPositionsPnL() {
    if (!userId.value || !symbolRoot.value) {
      console.log('⚠️ Missing userId or symbolRoot for exited P&L calculation')
      totalExitedPnL.value = null
      exitedOrdersBreakdown.value = null
      return
    }

    isLoading.value = true
    error.value = null

    try {
      console.log('🔍 Fetching exited positions P&L for:', {
        symbolRoot: symbolRoot.value,
        userId: userId.value,
        assetClass: assetClass.value
      })

      // Step 1: Fetch attached order IDs from position_order_mappings
      const mappingKeyPattern = `%|${symbolRoot.value}|%|${assetClass.value}|%`
      
      const { data: mappings, error: mappingsError } = await supabase
        .schema('hf')
        .from('position_order_mappings')
        .select('order_id')
        .eq('user_id', userId.value)
        .like('mapping_key', mappingKeyPattern)

      if (mappingsError) {
        throw new Error(`Failed to fetch position mappings: ${mappingsError.message}`)
      }

      const attachedOrderIds = new Set<string>(
        (mappings || []).map(m => m.order_id)
      )

      console.log('📎 Found attached order IDs:', attachedOrderIds.size)

      // Step 2: Fetch orders for symbolRoot excluding attached orders
      const symbolPattern = `${symbolRoot.value}%`
      
      let query = supabase
        .schema('hf')
        .from('orders')
        .select('id, symbol, buySell, quantity, tradePrice, tradeMoney, mtmPnl, dateTime')
        //.eq('user_id', userId.value)
        .like('symbol', symbolPattern)

      // Exclude attached orders if any exist
      if (attachedOrderIds.size > 0) {
        query = query.not('id', 'in', `(${Array.from(attachedOrderIds).join(',')})`)
      }

      const { data: orders, error: ordersError } = await query

      if (ordersError) {
        throw new Error(`Failed to fetch orders: ${ordersError.message}`)
      }

      console.log('📦 Fetched exited orders:', orders?.length || 0)

      // Calculate total mtmPnl
      const totalPnL = (orders || []).reduce((sum, order) => {
        const mtmPnl = parseFloat(order.mtmPnl) || 0
        return sum + mtmPnl
      }, 0)

      totalExitedPnL.value = totalPnL

      // Create detailed breakdown
      exitedOrdersBreakdown.value = {
        totalMtmPnL: totalPnL,
        orderCount: orders?.length || 0,
        orders: (orders || []).map(order => ({
          id: order.id,
          symbol: order.symbol,
          buySell: order.buySell,
          quantity: parseFloat(order.quantity) || 0,
          tradePrice: parseFloat(order.tradePrice) || 0,
          tradeMoney: parseFloat(order.tradeMoney) || 0,
          mtmPnl: parseFloat(order.mtmPnl) || 0,
          dateTime: order.dateTime
        }))
      }

      console.log('💰 Exited Positions P&L Summary:')
      console.log(`   Total Orders: ${exitedOrdersBreakdown.value.orderCount}`)
      console.log(`   Total MTM P&L: $${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

    } catch (err: any) {
      console.error('❌ Error calculating exited positions P&L:', err)
      error.value = err.message
      totalExitedPnL.value = null
      exitedOrdersBreakdown.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Watch for changes in symbolRoot, userId, or assetClass
  watch(
    [symbolRoot, userId, assetClass],
    () => {
      fetchExitedPositionsPnL()
    },
    { immediate: true }
  )

  return {
    totalExitedPnL,
    exitedOrdersBreakdown,
    isLoading,
    error,
    refetch: fetchExitedPositionsPnL
  }
}
import { ref, watch, type Ref } from 'vue'
import { useSupabase } from '@y2kfund/core'

interface ExitedOrder {
  id: string
  symbol: string
  buySell: string
  quantity: number
  tradePrice: number
  tradeMoney: number
  fifoPnlRealized: number
  dateTime: string
  internal_account_id: string
}

interface AccountBreakdown {
  internal_account_id: string
  accountDisplayName: string
  totalFifoPnlRealized: number
  orderCount: number
  orders: ExitedOrder[]
}

interface ExitedPnLBreakdown {
  totalFifoPnlRealized: number
  orderCount: number
  accountBreakdowns: AccountBreakdown[]
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

  async function getAccountDisplayName(internalAccountId: string): Promise<string> {
    try {
      // First try to get alias from user_account_alias
      const { data: aliasData, error: aliasError } = await supabase
        .schema('hf')
        .from('user_account_alias')
        .select('alias')
        .eq('user_id', userId.value)
        .eq('internal_account_id', internalAccountId)
        .single()

      if (!aliasError && aliasData?.alias) {
        return aliasData.alias
      }

      // If no alias found, get legal_entity from user_accounts_master
      const { data: masterData, error: masterError } = await supabase
        .schema('hf')
        .from('user_accounts_master')
        .select('legal_entity')
        .eq('internal_account_id', internalAccountId)
        .single()

      if (!masterError && masterData?.legal_entity) {
        return masterData.legal_entity
      }

      // Fallback to internal_account_id
      return internalAccountId
    } catch (err) {
      console.error('Error fetching account display name:', err)
      return internalAccountId
    }
  }

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
        .select('id, symbol, buySell, quantity, tradePrice, tradeMoney, fifoPnlRealized, dateTime, internal_account_id')
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

      // Group orders by internal_account_id
      const ordersByAccount = new Map<string, ExitedOrder[]>()
      
      for (const order of orders || []) {
        const accountId = order.internal_account_id || 'Unknown'
        if (!ordersByAccount.has(accountId)) {
          ordersByAccount.set(accountId, [])
        }
        ordersByAccount.get(accountId)!.push({
          id: order.id,
          symbol: order.symbol,
          buySell: order.buySell,
          quantity: parseFloat(order.quantity) || 0,
          tradePrice: parseFloat(order.tradePrice) || 0,
          tradeMoney: parseFloat(order.tradeMoney) || 0,
          fifoPnlRealized: parseFloat(order.fifoPnlRealized) || 0,
          dateTime: order.dateTime,
          internal_account_id: accountId
        })
      }

      // Create account breakdowns with display names
      const accountBreakdowns: AccountBreakdown[] = []
      let totalPnL = 0

      for (const [accountId, accountOrders] of ordersByAccount) {
        const accountPnL = accountOrders.reduce((sum, order) => sum + order.fifoPnlRealized, 0)
        totalPnL += accountPnL

        const displayName = await getAccountDisplayName(accountId)

        accountBreakdowns.push({
          internal_account_id: accountId,
          accountDisplayName: displayName,
          totalFifoPnlRealized: accountPnL,
          orderCount: accountOrders.length,
          orders: accountOrders
        })
      }

      // Sort by account display name
      accountBreakdowns.sort((a, b) => a.accountDisplayName.localeCompare(b.accountDisplayName))

      totalExitedPnL.value = totalPnL

      exitedOrdersBreakdown.value = {
        totalFifoPnlRealized: totalPnL,
        orderCount: orders?.length || 0,
        accountBreakdowns
      }

      console.log('💰 Exited Positions P&L Summary:')
      console.log(`   Total Orders: ${exitedOrdersBreakdown.value.orderCount}`)
      console.log(`   Total Accounts: ${accountBreakdowns.length}`)
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
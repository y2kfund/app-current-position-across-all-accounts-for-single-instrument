import { computed, ref, type Ref, type ComputedRef } from 'vue'

// Type for position data from IBKR
interface Position {
  accounting_quantity?: number | null
  avgPrice?: number | null
  legal_entity?: string | null
  internal_account_id?: string | null
  symbol?: string | null
  [key: string]: any
}

// Type for breakdown of each position's contribution
interface PositionBreakdown {
  account: string
  symbol: string
  quantity: number
  avgPrice: number
  cost: number
}

interface UseAverageCostPriceFromIBKRReturn {
  averageCostPriceFromIBKR: ComputedRef<number | null>
  totalCostFromIBKR: ComputedRef<number>
  totalSharesFromIBKR: ComputedRef<number>
  positionBreakdown: ComputedRef<PositionBreakdown[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
}

/**
 * Composable to calculate weighted average cost price from IBKR positions
 * 
 * Formula: Average Price = Total Cost / Total Quantity
 * Where: Total Cost = Σ (quantity × avgPrice) for each position
 * 
 * @param positions - Ref to array of positions from IBKR
 * @param userId - User ID (for validation/logging purposes)
 * @returns Object containing average price, totals, breakdown, and status
 */
export function useAverageCostPriceFromIBKR(
  positions: Ref<Position[] | null | undefined>,
  userId?: string | null
): UseAverageCostPriceFromIBKRReturn {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Calculate breakdown for each position
  const positionBreakdown = computed<PositionBreakdown[]>(() => {
    if (!positions.value || positions.value.length === 0) {
      return []
    }

    return positions.value.map((position) => {
      const quantity = position.accounting_quantity || 0
      const avgPrice = position.avgPrice || 0
      const cost = quantity * avgPrice

      return {
        account: position.legal_entity || position.internal_account_id || 'Unknown',
        symbol: position.symbol || 'Unknown',
        quantity,
        avgPrice,
        cost
      }
    })
  })

  // Calculate total cost (sum of qty × avgPrice for all positions)
  const totalCostFromIBKR = computed<number>(() => {
    return positionBreakdown.value.reduce((sum, pos) => sum + pos.cost, 0)
  })

  // Calculate total shares (sum of quantities)
  const totalSharesFromIBKR = computed<number>(() => {
    return positionBreakdown.value.reduce((sum, pos) => sum + pos.quantity, 0)
  })

  // Calculate weighted average cost price
  const averageCostPriceFromIBKR = computed<number | null>(() => {
    const totalQty = totalSharesFromIBKR.value
    const totalCost = totalCostFromIBKR.value

    // Avoid division by zero
    if (totalQty === 0) {
      return null
    }

    return totalCost / totalQty
  })

  // Log for debugging (optional)
  if (userId) {
    console.log(`📊 useAverageCostPriceFromIBKR initialized for user: ${userId}`)
  }

  return {
    averageCostPriceFromIBKR,
    totalCostFromIBKR,
    totalSharesFromIBKR,
    positionBreakdown,
    isLoading,
    error
  }
}

import { ref, computed, watch, type Ref } from 'vue'

interface CalculationBreakdown {
  totalShares: number
  avgCostPerShare: number
  totalCostBasis: number
  currentPricePerShare: number
  currentMarketValue: number
  unrealizedPnL: number
  pnlPercentage: number
}

export function useProfitAndLoss(
  overallAdjustedAvgPrice: Ref<number | null>,
  totalMainQuantity: Ref<number>,
  currentMarketPrice: Ref<number | null>
) {
  const totalCostBasis = ref<number | null>(null)
  const currentMarketValue = ref<number | null>(null)
  const unrealizedPnL = ref<number | null>(null)
  const pnlPercentage = ref<number | null>(null)
  const isProfitable = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Computed: Detailed calculation breakdown
  const calculationBreakdown = computed<CalculationBreakdown | null>(() => {
    if (
      overallAdjustedAvgPrice.value === null ||
      currentMarketPrice.value === null ||
      totalMainQuantity.value === 0
    ) {
      return null
    }

    const totalShares = totalMainQuantity.value
    const avgCostPerShare = overallAdjustedAvgPrice.value
    const currentPricePerShare = currentMarketPrice.value

    // Calculate Total Cost Basis
    const totalCostBasisCalc = totalShares * avgCostPerShare

    // Calculate Current Market Value
    const currentMarketValueCalc = totalShares * currentPricePerShare

    // Calculate Unrealized P&L
    const unrealizedPnLCalc = currentMarketValueCalc - totalCostBasisCalc

    // Calculate P&L Percentage
    const pnlPercentageCalc = totalCostBasisCalc !== 0
      ? (unrealizedPnLCalc / totalCostBasisCalc) * 100
      : 0

    return {
      totalShares,
      avgCostPerShare,
      totalCostBasis: totalCostBasisCalc,
      currentPricePerShare,
      currentMarketValue: currentMarketValueCalc,
      unrealizedPnL: unrealizedPnLCalc,
      pnlPercentage: pnlPercentageCalc
    }
  })

  // Watch calculation breakdown and update individual refs
  watch(
    calculationBreakdown,
    (breakdown) => {
      if (breakdown) {
        totalCostBasis.value = breakdown.totalCostBasis
        currentMarketValue.value = breakdown.currentMarketValue
        unrealizedPnL.value = breakdown.unrealizedPnL
        pnlPercentage.value = breakdown.pnlPercentage
        isProfitable.value = breakdown.unrealizedPnL >= 0

        console.log('💰 P&L Calculation:')
        console.log(`   Total Shares: ${breakdown.totalShares.toLocaleString()}`)
        console.log(`   Avg Cost per Share: $${breakdown.avgCostPerShare.toFixed(2)}`)
        console.log(`   Total Cost Basis: $${breakdown.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        console.log(`   Current Price per Share: $${breakdown.currentPricePerShare.toFixed(2)}`)
        console.log(`   Current Market Value: $${breakdown.currentMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        console.log(`   Unrealized P&L: ${breakdown.unrealizedPnL >= 0 ? '+' : ''}$${breakdown.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        console.log(`   P&L Percentage: ${breakdown.pnlPercentage.toFixed(2)}%`)
      } else {
        totalCostBasis.value = null
        currentMarketValue.value = null
        unrealizedPnL.value = null
        pnlPercentage.value = null
        isProfitable.value = false
        console.log('⚠️ P&L Calculation: Missing required data')
      }
    },
    { immediate: true }
  )

  return {
    totalCostBasis,
    currentMarketValue,
    unrealizedPnL,
    pnlPercentage,
    isProfitable,
    calculationBreakdown,
    isLoading,
    error
  }
}

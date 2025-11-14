import { computed, type Ref } from 'vue'
import type { Position } from '@y2kfund/core'

interface StockCapitalBreakdown {
  assetType: 'STK'
  totalShares: number
  pricePerShare: number
  totalCapital: number
}

interface OptionsPositionDetail {
  account: string
  symbol: string
  quantity: number
  marketPrice: number
  marketValue: number
  optionType: 'PUT' | 'CALL'
}

interface OptionsCapitalBreakdown {
  assetType: 'OPT'
  positions: OptionsPositionDetail[]
  totalOptionsCapital: number
}

type CapitalBreakdown = StockCapitalBreakdown | OptionsCapitalBreakdown

export function useCapitalUsed(
  assetType: Ref<string | null>,
  totalContractQuantity: Ref<number>,
  currentMarketPrice: Ref<number | null>,
  positions: Ref<Position[] | undefined>,
  putPositions: Ref<Position[] | undefined>,
  callPositions: Ref<Position[] | undefined>
) {
  console.log('🏦 useCapitalUsed initialized')

  const isLoading = computed(() => false)
  const error = computed<string | null>(() => null)

  const calculationBreakdown = computed<CapitalBreakdown | null>(() => {
    const assetTypeValue = assetType.value

    console.log('🏦 Calculating capital breakdown for asset type:', assetTypeValue)

    // Stock capital calculation
    if (assetTypeValue === 'STK') {
      const totalShares = totalContractQuantity.value
      const pricePerShare = currentMarketPrice.value

      if (pricePerShare === null || totalShares === 0) {
        console.log('⚠️ Cannot calculate stock capital: missing price or quantity')
        return null
      }

      const totalCapital = totalShares * pricePerShare

      console.log('📊 Stock capital breakdown:', {
        totalShares,
        pricePerShare,
        totalCapital
      })

      return {
        assetType: 'STK',
        totalShares,
        pricePerShare,
        totalCapital
      }
    }

    // Options capital calculation - DISABLED FOR NOW
    // TODO: Implement options capital calculation later
    if (assetTypeValue === 'OPT') {
      console.log('⚠️ Options capital calculation not implemented yet')
      return null
    }

    console.log('⚠️ Unknown or null asset type, cannot calculate capital')
    return null
  })

  const totalCapitalUsed = computed<number | null>(() => {
    const breakdown = calculationBreakdown.value

    if (!breakdown) return null

    // Only STK is supported for now
    if (breakdown.assetType === 'STK') {
      return breakdown.totalCapital
    }

    return null
  })

  console.log('🏦 useCapitalUsed ready')

  return {
    totalCapitalUsed,
    calculationBreakdown,
    isLoading,
    error
  }
}

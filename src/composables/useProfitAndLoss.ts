import { ref, computed, watch, type Ref } from 'vue'
import type { Position } from '@y2kfund/core'

interface CalculationBreakdown {
  totalShares: number
  avgCostPerShare: number
  totalCostBasis: number
  currentPricePerShare: number
  currentMarketValue: number
  unrealizedPnL: number
  pnlPercentage: number
}

interface PositionBreakdown {
  account: string
  strike: number | null
  expiry: string | null
  quantity: number
  premiumReceived: number
  currentValue: number
  positionPnL: number
  symbol: string
}

interface OptionsCalculationBreakdown {
  // Position summary
  totalContracts: number
  optionType: 'PUT' | 'CALL' | 'MIXED'
  positionType: 'SHORT' | 'LONG' | 'MIXED'
  
  // Financial breakdown
  totalPremiumReceived: number
  currentMarketLiability: number
  unrealizedPnL: number
  pnlPercentage: number
  
  // Per-position breakdown
  positions: PositionBreakdown[]
}

export function useProfitAndLoss(
  overallAdjustedAvgPrice: Ref<number | null>,
  totalMainQuantity: Ref<number>,
  currentMarketPrice: Ref<number | null>,
  putPositions: Ref<Position[] | undefined> = ref(undefined),
  callPositions: Ref<Position[] | undefined> = ref(undefined)
) {
  const totalCostBasis = ref<number | null>(null)
  const currentMarketValue = ref<number | null>(null)
  const unrealizedPnL = ref<number | null>(null)
  const pnlPercentage = ref<number | null>(null)
  const isProfitable = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Helper function to calculate options P&L
  const calculateOptionsPnL = (): OptionsCalculationBreakdown | null => {
    const allPositions: Position[] = [
      ...(putPositions.value || []),
      ...(callPositions.value || [])
    ]

    if (allPositions.length === 0) {
      console.log('⚠️ No options positions available for P&L calculation')
      return null
    }

    console.log('📊 Calculating options P&L for positions:', allPositions.length)

    let totalContracts = 0
    let totalPremium = 0
    let totalCurrentValue = 0
    let totalPnL = 0
    const positionBreakdowns: PositionBreakdown[] = []
    
    // Track option types
    const optionTypes = new Set<string>()
    const positionTypes = new Set<string>()

    allPositions.forEach(position => {
      // Get basic data
      const quantity = position.accounting_quantity ?? position.qty
      const account = position.legal_entity || position.internal_account_id
      
      // Parse strike and expiry from symbol or direct fields
      // Symbol format: "BMNR 2025-11-21 55 P" or "BMNR 251121P00055000"
      let strike: number | null = null
      let expiry: string | null = null
      let optionType: string = 'UNKNOWN'
      
      // Try to parse from symbol
      const symbolMatch = position.symbol.match(/(\d{4}-\d{2}-\d{2})\s+(\d+(?:\.\d+)?)\s+([CP])/)
      if (symbolMatch) {
        expiry = symbolMatch[1]
        strike = parseFloat(symbolMatch[2])
        optionType = symbolMatch[3] === 'C' ? 'CALL' : 'PUT'
      } else {
        // Try compact format: BMNR 251121P00055000
        const compactMatch = position.symbol.match(/([CP])(\d{8})/)
        if (compactMatch) {
          optionType = compactMatch[1] === 'C' ? 'CALL' : 'PUT'
          const strikeStr = compactMatch[2]
          strike = parseFloat(strikeStr) / 1000 // Convert from 00055000 to 55
        }
      }
      
      // Track types
      optionTypes.add(optionType)
      positionTypes.add(quantity < 0 ? 'SHORT' : 'LONG')
      
      // Financial calculations
      // Use computed_cash_flow_on_entry for premium received (absolute value)
      const premiumReceived = Math.abs(position.computed_cash_flow_on_entry || 0)
      
      // Use market_value for current liability (absolute value)
      const currentValue = Math.abs(position.market_value || 0)
      
      // Use unrealized_pnl directly from position
      const positionPnL = position.unrealized_pnl || 0
      
      // Accumulate totals
      totalContracts += Math.abs(quantity)
      totalPremium += premiumReceived
      totalCurrentValue += currentValue
      totalPnL += positionPnL
      
      // Add to breakdown
      positionBreakdowns.push({
        account,
        strike,
        expiry,
        quantity,
        premiumReceived,
        currentValue,
        positionPnL,
        symbol: position.symbol
      })
      
      console.log(`📍 Position: ${position.symbol} (${account})`)
      console.log(`   Quantity: ${quantity}`)
      console.log(`   Premium Received: $${premiumReceived.toFixed(2)}`)
      console.log(`   Current Value: $${currentValue.toFixed(2)}`)
      console.log(`   P&L: $${positionPnL.toFixed(2)}`)
    })
    
    // Determine overall option and position type
    const overallOptionType = optionTypes.size === 1 
      ? Array.from(optionTypes)[0] as 'PUT' | 'CALL'
      : 'MIXED'
    
    const overallPositionType = positionTypes.size === 1
      ? Array.from(positionTypes)[0] as 'SHORT' | 'LONG'
      : 'MIXED'
    
    // Calculate P&L percentage
    const pnlPct = totalPremium > 0 ? (totalPnL / totalPremium) * 100 : 0
    
    console.log('💰 Options P&L Summary:')
    console.log(`   Total Contracts: ${totalContracts}`)
    console.log(`   Total Premium Received: $${totalPremium.toFixed(2)}`)
    console.log(`   Current Market Liability: $${totalCurrentValue.toFixed(2)}`)
    console.log(`   Unrealized P&L: $${totalPnL.toFixed(2)}`)
    console.log(`   P&L Percentage: ${pnlPct.toFixed(2)}%`)
    
    return {
      totalContracts,
      optionType: overallOptionType,
      positionType: overallPositionType,
      totalPremiumReceived: totalPremium,
      currentMarketLiability: totalCurrentValue,
      unrealizedPnL: totalPnL,
      pnlPercentage: pnlPct,
      positions: positionBreakdowns
    }
  }

  // Computed: Detailed calculation breakdown (handles both stocks and options)
  const calculationBreakdown = computed<CalculationBreakdown | OptionsCalculationBreakdown | null>(() => {
    // Check if we have stock positions (totalMainQuantity > 0)
    if (totalMainQuantity.value > 0 && 
        overallAdjustedAvgPrice.value !== null && 
        currentMarketPrice.value !== null) {
      
      // STOCK P&L CALCULATION
      console.log('📈 Calculating STOCK P&L')
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
    } else {
      // OPTIONS P&L CALCULATION
      console.log('📊 No stock positions, calculating OPTIONS P&L')
      return calculateOptionsPnL()
    }
  })

  // Watch calculation breakdown and update individual refs
  watch(
    calculationBreakdown,
    (breakdown) => {
      if (breakdown) {
        // Type guard to check if it's a stock breakdown
        if ('totalShares' in breakdown) {
          // Stock P&L
          totalCostBasis.value = breakdown.totalCostBasis
          currentMarketValue.value = breakdown.currentMarketValue
          unrealizedPnL.value = breakdown.unrealizedPnL
          pnlPercentage.value = breakdown.pnlPercentage
          isProfitable.value = breakdown.unrealizedPnL >= 0

          console.log('💰 STOCK P&L Calculation:')
          console.log(`   Total Shares: ${breakdown.totalShares.toLocaleString()}`)
          console.log(`   Avg Cost per Share: $${breakdown.avgCostPerShare.toFixed(2)}`)
          console.log(`   Total Cost Basis: $${breakdown.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          console.log(`   Current Price per Share: $${breakdown.currentPricePerShare.toFixed(2)}`)
          console.log(`   Current Market Value: $${breakdown.currentMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          console.log(`   Unrealized P&L: ${breakdown.unrealizedPnL >= 0 ? '+' : ''}$${breakdown.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          console.log(`   P&L Percentage: ${breakdown.pnlPercentage.toFixed(2)}%`)
        } else {
          // Options P&L
          totalCostBasis.value = breakdown.totalPremiumReceived
          currentMarketValue.value = breakdown.currentMarketLiability
          unrealizedPnL.value = breakdown.unrealizedPnL
          pnlPercentage.value = breakdown.pnlPercentage
          isProfitable.value = breakdown.unrealizedPnL >= 0

          console.log('💰 OPTIONS P&L Updated:')
          console.log(`   Total Contracts: ${breakdown.totalContracts}`)
          console.log(`   ${breakdown.positionType} ${breakdown.optionType}`)
          console.log(`   Premium Received: $${breakdown.totalPremiumReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          console.log(`   Current Liability: $${breakdown.currentMarketLiability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          console.log(`   Unrealized P&L: ${breakdown.unrealizedPnL >= 0 ? '+' : ''}$${breakdown.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          console.log(`   P&L Percentage: ${breakdown.pnlPercentage.toFixed(2)}%`)
        }
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

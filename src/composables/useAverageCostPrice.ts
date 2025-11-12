import { ref, watch, computed, type Ref } from 'vue'
import { useSupabase, generatePositionMappingKey, type Position } from '@y2kfund/core'

interface PositionMapping {
  mapping_key: string
  attached_position_key: string
}

interface PositionCalculation {
  symbol: string
  avgPrice: number
  quantity: number
  totalCost: number
  isAttached: boolean
  mappingKey?: string
  account?: string
}

interface PositionGroup {
  mainPosition: PositionCalculation
  attachedPositions: PositionCalculation[]
  callPositions: PositionCalculation[]
  putPositions: PositionCalculation[]
  
  // Original totals
  groupTotalCost: number
  groupTotalQuantity: number
  
  // Adjusted calculations (excluding puts)
  callPositionsTotalCost: number
  netCostExcludingPuts: number
  adjustedAvgPricePerShare: number
}

export function useAverageCostPrice(
  positions: Ref<Position[] | undefined>,
  userId: string | null | undefined
) {
  const supabase = useSupabase()
  const averageCostPrice = ref<number | null>(null)
  const totalCost = ref<number>(0)
  const totalQuantity = ref<number>(0)
  const mainPositionsCount = ref<number>(0)
  const attachedPositionsCount = ref<number>(0)
  const positionBreakdown = ref<PositionCalculation[]>([])
  const positionGroups = ref<PositionGroup[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const mappings = ref<PositionMapping[]>([])

  // Computed: Overall adjusted average price (excluding puts, subtracting calls)
  const overallAdjustedAvgPrice = computed(() => {
    if (positionGroups.value.length === 0) return null
    const totalNetCost = positionGroups.value.reduce((sum, g) => sum + g.netCostExcludingPuts, 0)
    const totalMainQty = positionGroups.value.reduce((sum, g) => sum + g.mainPosition.quantity, 0)
    console.log(`🔢 Calculating overall adjusted average: Total Net Cost = $${totalNetCost}, Total Main Qty = ${totalMainQty}`)
    return totalMainQty > 0 ? totalNetCost / totalMainQty : null
  })

  const calculateAverageCost = async () => {
    if (!positions.value || positions.value.length === 0 || !userId) {
      averageCostPrice.value = null
      return
    }

    isLoading.value = true
    error.value = null

    try {
      console.log('📊 Calculating average cost price for positions:', positions.value.length)

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

      // Step 2: Fetch attached position keys from position_position_mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .schema('hf')
        .from('position_position_mappings')
        .select('mapping_key, attached_position_key')
        .eq('user_id', userId)
        .in('mapping_key', mappingKeys)

      if (mappingsError) {
        throw new Error(`Failed to fetch position mappings: ${mappingsError.message}`)
      }

      mappings.value = mappingsData || []
      console.log('🔗 Found mappings:', mappings.value.length)

      // Step 3: Parse attached position keys and fetch those positions
      const attachedPositionKeys = mappings.value.map(m => m.attached_position_key)
      
      // Create a map of mapping_key to attached positions
      const mappingToAttached = new Map<string, string[]>()
      mappings.value.forEach(m => {
        if (!mappingToAttached.has(m.mapping_key)) {
          mappingToAttached.set(m.mapping_key, [])
        }
        mappingToAttached.get(m.mapping_key)!.push(m.attached_position_key)
      })

      // Step 4: Fetch attached positions data if any
      let attachedPositions: Position[] = []
      if (attachedPositionKeys.length > 0) {
        // Parse attached position keys to get position details
        // Format: internal_account_id|symbol|contract_quantity|asset_class|conid
        const attachedQueries = attachedPositionKeys.map(key => {
          const [internal_account_id, symbol, contract_quantity, asset_class, conid] = key.split('|')
          return { internal_account_id, symbol, contract_quantity: parseFloat(contract_quantity), asset_class, conid }
        })

        // Fetch latest positions for these attached position keys
        const positionsFetchPromises = attachedQueries.map(async (query) => {
          const { data, error } = await supabase
            .schema('hf')
            .from('positions')
            .select('*')
            .eq('internal_account_id', query.internal_account_id)
            .eq('symbol', query.symbol)
            .eq('asset_class', query.asset_class)
            .eq('conid', query.conid)
            .order('fetched_at', { ascending: false })
            .limit(1)
            .single()

          if (error) {
            console.warn(`⚠️ Failed to fetch attached position for ${query.symbol}:`, error.message)
            return null
          }
          return data
        })

        const results = await Promise.all(positionsFetchPromises)
        attachedPositions = results.filter(p => p !== null) as Position[]
        console.log('📦 Fetched attached positions:', attachedPositions.length)
      }

      // Step 5: Calculate weighted average cost and create groups
      let calcTotalCost = 0
      let calcTotalQuantity = 0
      const breakdown: PositionCalculation[] = []
      const groups: PositionGroup[] = []

      // Create a map of attached positions by mapping key
      const attachedByMappingKey = new Map<string, Position[]>()
      mappings.value.forEach(m => {
        const attached = attachedPositions.find(ap => {
          const attachedKey = generatePositionMappingKey({
            internal_account_id: ap.internal_account_id,
            symbol: ap.symbol,
            contract_quantity: ap.contract_quantity ?? ap.qty,
            asset_class: ap.asset_class,
            conid: ap.conid
          })
          return attachedKey === m.attached_position_key
        })
        if (attached) {
          if (!attachedByMappingKey.has(m.mapping_key)) {
            attachedByMappingKey.set(m.mapping_key, [])
          }
          attachedByMappingKey.get(m.mapping_key)!.push(attached)
        }
      })

      // Process each main position and its attached positions
      mainPositionsCount.value = positions.value.length
      positions.value.forEach(pos => {
        const qty = pos.accounting_quantity ?? pos.qty
        const avgPrice = pos.avgPrice ?? 0
        const cost = avgPrice * qty
        
        const mappingKey = generatePositionMappingKey({
          internal_account_id: pos.internal_account_id,
          symbol: pos.symbol,
          contract_quantity: pos.contract_quantity ?? pos.qty,
          asset_class: pos.asset_class,
          conid: pos.conid
        })

        calcTotalCost += cost
        calcTotalQuantity += qty

        const mainPosCalc: PositionCalculation = {
          symbol: pos.symbol,
          avgPrice,
          quantity: qty,
          totalCost: cost,
          isAttached: false,
          mappingKey,
          account: pos.legal_entity || pos.internal_account_id
        }

        breakdown.push(mainPosCalc)
        console.log(`📍 Main position: ${pos.symbol} @ ${avgPrice} × ${qty} = ${cost}`)

        // Get attached positions for this main position
        const attachedForThis = attachedByMappingKey.get(mappingKey) || []
        const attachedCalcs: PositionCalculation[] = []
        const callCalcs: PositionCalculation[] = []
        const putCalcs: PositionCalculation[] = []
        let groupCost = cost
        let groupQty = qty
        let callPositionsTotalCost = 0

        attachedForThis.forEach(attachedPos => {
          const attachedQty = attachedPos.accounting_quantity ?? attachedPos.qty
          const attachedAvgPrice = attachedPos.avgPrice ?? 0
          const attachedCost = attachedAvgPrice * attachedQty
          
          calcTotalCost += attachedCost
          calcTotalQuantity += attachedQty
          groupCost += attachedCost
          groupQty += attachedQty

          const attachedCalc: PositionCalculation = {
            symbol: attachedPos.symbol,
            avgPrice: attachedAvgPrice,
            quantity: attachedQty,
            totalCost: attachedCost,
            isAttached: true,
            account: attachedPos.legal_entity || attachedPos.internal_account_id
          }

          attachedCalcs.push(attachedCalc)
          breakdown.push(attachedCalc)
          
          // Determine if this is a call or put based on symbol
          // Options typically have format: "MSFT NOV2025 525 C" or "MSFT 251107C00525000 100"
          const symbolStr = attachedPos.symbol.toUpperCase()
          const isCall = symbolStr.includes(' C ') || symbolStr.includes('C00') || /\sC\b/.test(symbolStr)
          const isPut = symbolStr.includes(' P ') || symbolStr.includes('P00') || /\sP\b/.test(symbolStr)
          
          if (isCall) {
            callCalcs.push(attachedCalc)
            callPositionsTotalCost += attachedCost
            console.log(`📞 Call position: ${attachedPos.symbol} @ ${attachedAvgPrice} × ${attachedQty} = ${attachedCost}`)
          } else if (isPut) {
            putCalcs.push(attachedCalc)
            console.log(`� Put position: ${attachedPos.symbol} @ ${attachedAvgPrice} × ${attachedQty} = ${attachedCost}`)
          } else {
            console.log(`�🔗 Attached position: ${attachedPos.symbol} @ ${attachedAvgPrice} × ${attachedQty} = ${attachedCost}`)
          }
        })

        // Calculate adjusted values (main position cost - absolute call positions cost, excluding puts)
        const netCostExcludingPuts = cost - Math.abs(callPositionsTotalCost)
        const adjustedAvgPricePerShare = qty > 0 ? netCostExcludingPuts / qty : 0

        console.log(`📊 Client: ${mainPosCalc.account}`)
        console.log(`   Main Cost: $${cost.toFixed(2)}`)
        console.log(`   Call Costs: $${callPositionsTotalCost.toFixed(2)} (absolute: $${Math.abs(callPositionsTotalCost).toFixed(2)})`)
        console.log(`   Net Cost (excl. puts): $${netCostExcludingPuts.toFixed(2)}`)
        console.log(`   Adjusted Avg Price: $${adjustedAvgPricePerShare.toFixed(2)} per share`)

        // Create group
        groups.push({
          mainPosition: mainPosCalc,
          attachedPositions: attachedCalcs,
          callPositions: callCalcs,
          putPositions: putCalcs,
          groupTotalCost: groupCost,
          groupTotalQuantity: groupQty,
          callPositionsTotalCost,
          netCostExcludingPuts,
          adjustedAvgPricePerShare
        })
      })

      positionBreakdown.value = breakdown
      positionGroups.value = groups
      attachedPositionsCount.value = attachedPositions.length

      // Update refs
      totalCost.value = calcTotalCost
      totalQuantity.value = calcTotalQuantity

      // Calculate standard average (all positions)
      if (calcTotalQuantity > 0) {
        averageCostPrice.value = calcTotalCost / calcTotalQuantity
        console.log(`✅ Standard Average Cost Price: $${averageCostPrice.value.toFixed(2)} (Total: $${calcTotalCost} / Qty: ${calcTotalQuantity})`)
      } else {
        averageCostPrice.value = null
        console.log('⚠️ Total quantity is 0, cannot calculate average')
      }

      // Calculate overall adjusted average (excluding puts, subtracting calls from main positions)
      const totalNetCost = groups.reduce((sum, g) => sum + g.netCostExcludingPuts, 0)
      const totalMainQty = groups.reduce((sum, g) => sum + g.mainPosition.quantity, 0)
      const overallAdjustedAvg = totalMainQty > 0 ? totalNetCost / totalMainQty : null

      if (overallAdjustedAvg !== null) {
        console.log(`🎯 Overall Adjusted Average: $${overallAdjustedAvg.toFixed(2)} per share (Net: $${totalNetCost.toFixed(2)} / Main Qty: ${totalMainQty})`)
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to calculate average cost price'
      console.error('❌ Error calculating average cost price:', err)
      averageCostPrice.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Watch positions and recalculate when they change
  watch(
    () => positions.value,
    () => {
      if (positions.value && positions.value.length > 0 && userId) {
        calculateAverageCost()
      } else {
        averageCostPrice.value = null
      }
    },
    { immediate: true, deep: true }
  )

  return {
    averageCostPrice,
    overallAdjustedAvgPrice,
    totalCost,
    totalQuantity,
    mainPositionsCount,
    attachedPositionsCount,
    positionBreakdown,
    positionGroups,
    isLoading,
    error,
    refetch: calculateAverageCost
  }
}

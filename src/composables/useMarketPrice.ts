import { ref, watch, type Ref } from 'vue'
import { useSupabase } from '@y2kfund/core'

interface MarketPriceData {
  symbol: string
  conid: number
  market_price: number
  week_52_high?: number | null
  week_52_low?: number | null
  pe_ratio?: number | null
  eps?: number | null
  market_cap?: number | null
  computed_peg_ratio?: number | null
  last_fetched_at: string
}

export function useMarketPrice(conid: Ref<number | null> , symbolRoot: string) {
  const supabase = useSupabase()
  const marketData = ref<MarketPriceData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchMarketPrice = async (conidValue: number | null): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      let query = supabase
        .schema('hf')
        .from('market_price')
        .select('symbol, conid, market_price, week_52_high, week_52_low, pe_ratio, eps, market_cap, computed_peg_ratio, last_fetched_at')
      
      // If conid is available, search by conid
      if (conidValue && conidValue > 0) {
        console.log(`🔍 Fetching market price for conid: ${conidValue}`)
        query = query.eq('conid', conidValue)
      } 
      // Otherwise, fallback to searching by symbolRoot
      else if (symbolRoot) {
        console.log(`🔍 Fetching market price for symbol: ${symbolRoot}`)
        query = query.eq('symbol', symbolRoot)
      } else {
        console.log('⚠️ No conid or symbolRoot available')
        marketData.value = null
        error.value = 'No conid or symbol provided'
        return
      }
      
      const { data, error: dbError } = await query
        .order('id', { ascending: false })
        .limit(1)
        .single()

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`)
      }

      if (data) {
        marketData.value = data
        console.log(`✅ Market price fetched: $${data.market_price} for ${data.symbol}`)
      } else {
        marketData.value = null
        const searchCriteria = conidValue ? `conid: ${conidValue}` : `symbol: ${symbolRoot}`
        console.log(`⚠️ No market price found for ${searchCriteria}`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch market price'
      console.error('❌ Error fetching market price:', err)
      marketData.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Watch for conid changes and fetch price
  watch(
    conid,
    (newConid) => {
      if (newConid && newConid > 0) {
        console.log(`🎯 Conid changed to: ${newConid}, fetching price...`)
        fetchMarketPrice(newConid)
      } else if (symbolRoot) {
        console.log(`🎯 No conid available, using symbolRoot: ${symbolRoot}`)
        fetchMarketPrice(null)
      } else {
        console.log('⚠️ No valid conid or symbolRoot available')
        marketData.value = null
        error.value = null
      }
    },
    { immediate: true }
  )

  const refetch = () => {
    if (conid.value && conid.value > 0) {
      fetchMarketPrice(conid.value)
    } else if (symbolRoot) {
      fetchMarketPrice(null)
    }
  }

  return {
    marketData,
    isLoading,
    error,
    refetch
  }
}
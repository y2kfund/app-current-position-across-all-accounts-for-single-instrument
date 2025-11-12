import { ref, watch, type Ref } from 'vue'
import { useSupabase } from '@y2kfund/core'

interface MarketPriceData {
  symbol: string
  conid: number
  market_price: number
  last_fetched_at: string
}

export function useMarketPrice(conid: Ref<number | null>) {
  const supabase = useSupabase()
  const marketData = ref<MarketPriceData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchMarketPrice = async (conidValue: number): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      console.log(`🔍 Fetching market price for conid: ${conidValue}`)
      
      const { data, error: dbError } = await supabase
        .schema('hf')
        .from('market_price')
        .select('symbol, conid, market_price, last_fetched_at')
        .eq('conid', conidValue)
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
        console.log('⚠️ No market price found for conid:', conidValue)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch market price'
      console.error('❌ Error fetching market price:', err)
      marketData.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Watch for conid changes and fetch price only when conid is available
  watch(
    conid,
    (newConid) => {
      if (newConid && newConid > 0) {
        console.log(`🎯 Conid changed to: ${newConid}, fetching price...`)
        fetchMarketPrice(newConid)
      } else {
        console.log('⚠️ No valid conid available yet')
        marketData.value = null
        error.value = null
      }
    },
    { immediate: true }
  )

  const refetch = () => {
    if (conid.value && conid.value > 0) {
      fetchMarketPrice(conid.value)
    }
  }

  return {
    marketData,
    isLoading,
    error,
    refetch
  }
}
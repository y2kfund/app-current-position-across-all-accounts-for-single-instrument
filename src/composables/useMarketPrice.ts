import { ref, watch, type Ref } from 'vue'

interface MarketDataResponse {
  '31'?: string
  conid?: number
  conidEx?: string
  _updated?: number
  [key: string]: any
}

export function useMarketPrice(conid: Ref<number | null>) {
  const price = ref<number | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchMarketPrice = async (conidValue: number, retryCount = 0): Promise<void> => {
    const maxRetries = 3
    isLoading.value = true
    error.value = null

    try {
      console.log(`🔍 Fetching market price for conid: ${conidValue}, attempt: ${retryCount + 1}`)
      
      const baseUrl = import.meta.env.VITE_IBKR_BANSI_URL
      const response = await fetch(
        `${baseUrl}/api/marketdata?conid=${conidValue}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: MarketDataResponse = await response.json()
      console.log('📊 Market data response:', data)

      // Check if '31' key exists
      if (data['31']) {
        // Remove 'C' prefix if present and parse the price
        const priceString = data['31'].replace(/^C/, '')
        price.value = parseFloat(priceString)
        console.log(`✅ Market price fetched: $${price.value}`)
      } else if (retryCount < maxRetries) {
        // Retry after a short delay
        console.log(`⏳ Retry ${retryCount + 1}/${maxRetries} for conid ${conidValue}`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return fetchMarketPrice(conidValue, retryCount + 1)
      } else {
        throw new Error('Market price (key "31") not available after retries')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch market price'
      console.error('❌ Error fetching market price:', err)
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
        price.value = null
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
    price,
    isLoading,
    error,
    refetch
  }
}
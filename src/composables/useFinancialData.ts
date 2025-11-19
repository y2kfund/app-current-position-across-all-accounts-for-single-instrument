import { ref, watch, type Ref } from 'vue'
import { useSupabase } from '@y2kfund/core'

interface FinancialData {
  symbol: string
  conid: number
  week_52_high?: number | null
  week_52_low?: number | null
  pe_ratio?: number | null
  eps?: number | null
  market_cap?: number | null
  computed_peg_ratio?: number | null
  last_updated_at: string
}

export function useFinancialData(conid: Ref<number | null> , symbolRoot: string) {
  const supabase = useSupabase()
  const financialData = ref<FinancialData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchFinancialData = async (conidValue: number | null): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      let query = supabase
        .schema('hf')
        .from('financial_data')
        .select('symbol, conid, week_52_high, week_52_low, pe_ratio, eps, market_cap, computed_peg_ratio, last_updated_at')
      
      // If conid is available, search by conid
      if (conidValue && conidValue > 0) {
        query = query.eq('conid', conidValue)
      } 
      // Otherwise, fallback to searching by symbolRoot
      else if (symbolRoot) {
        console.log(`🔍 Fetching financial data for symbol: ${symbolRoot}`)
        query = query.eq('symbol', symbolRoot)
      } else {
        console.log('⚠️ No conid or symbolRoot available')
        financialData.value = null
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
        financialData.value = data
        console.log(`✅ Financial data fetched for ${data.symbol}`)
      } else {
        financialData.value = null
        const searchCriteria = conidValue ? `conid: ${conidValue}` : `symbol: ${symbolRoot}`
        console.log(`⚠️ No financial data found for ${searchCriteria}`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch financial data'
      console.error('❌ Error fetching financial data:', err)
      financialData.value = null
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
        fetchFinancialData(newConid)
      } else if (symbolRoot) {
        console.log(`🎯 No conid available, using symbolRoot: ${symbolRoot}`)
        fetchFinancialData(null)
      } else {
        console.log('⚠️ No valid conid or symbolRoot available')
        financialData.value = null
        error.value = null
      }
    },
    { immediate: true }
  )

  const refetch = () => {
    if (conid.value && conid.value > 0) {
      fetchFinancialData(conid.value)
    } else if (symbolRoot) {
      fetchFinancialData(null)
    }
  }

  return {
    financialData,
    isLoading,
    error,
    refetch
  }
}
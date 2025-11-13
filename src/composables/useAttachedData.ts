import { computed, ref } from 'vue'
import { 
  usePositionTradeMappingsQuery,
  usePositionPositionMappingsQuery,
  generatePositionMappingKey,
  fetchPositionsBySymbolRoot,
  useSupabase,
  type Position
} from '@y2kfund/core'

// Define Trade type locally if not exported from core/trades
interface Trade {
  tradeID?: string
  symbol: string
  quantity: string
  tradePrice: string
  buySell: string
  tradeDate: string
  settleDateTarget: string
  ibCommission: string
  assetCategory: string
  [key: string]: any
}

export function useAttachedData(userId: string | undefined | null) {
  const supabase = useSupabase()
  
  // Query mappings only
  const positionTradeMappingsQuery = usePositionTradeMappingsQuery(userId)
  const positionPositionMappingsQuery = usePositionPositionMappingsQuery(userId)
  
  // Computed maps - MUST return Map objects
  const positionTradesMap = computed(() => {
    const data = positionTradeMappingsQuery.data.value
    if (!data) {
      return new Map<string, Set<string>>()
    }
    return data
  })
  
  const positionPositionsMap = computed(() => {
    const data = positionPositionMappingsQuery.data.value
    if (!data) {
      return new Map<string, Set<string>>()
    }
    return data
  })
  
  // Cache for fetched positions and trades
  const attachedPositionsCache = ref<Map<string, Position[]>>(new Map())
  const tradesCache = ref<Map<string, Trade[]>>(new Map())
  
  // Helper function to generate position key
  function getPositionKey(position: any): string {
    return generatePositionMappingKey({
      internal_account_id: position.internal_account_id,
      symbol: position.symbol,
      contract_quantity: position.contract_quantity,
      asset_class: position.asset_class || 'OPT',
      conid: position.conid || ''
    })
  }
  
  // Helper function to extract symbol root
  function extractSymbolRoot(symbol: string): string | null {
    if (!symbol) return null
    const match = symbol.match(/^([A-Z]+)\b/)
    return match?.[1] || null
  }
  
  // Fetch trades for a specific symbol root using trades table
  async function fetchTradesForSymbol(symbolRoot: string, accountId: string): Promise<Trade[]> {
    if (!userId) return []
    
    // Check cache first
    if (tradesCache.value.has(symbolRoot)) {
      return tradesCache.value.get(symbolRoot) || []
    }
    
    try {
      console.log('🔍 Fetching trades for symbol root:', symbolRoot)
      
      // Fetch from trades table (NOT trades table)
      const { data: trades, error } = await supabase
        .schema('hf')
        .from('trades')
        .select('*')
        //.eq('internal_account_id', accountId)
        .ilike('symbol', `${symbolRoot}%`)
        .order('tradeDate', { ascending: false })
      
      if (error) {
        console.error('❌ Error fetching trades:', error)
        throw error
      }
      
      console.log(`✅ Fetched ${trades?.length || 0} trades for ${symbolRoot}`)
      
      const tradesList = trades || []
      tradesCache.value.set(symbolRoot, tradesList)
      return tradesList
    } catch (error) {
      console.error('❌ Error fetching trades:', error)
      return []
    }
  }
  
  // Get attached trades for a position
  async function getAttachedTrades(position: any): Promise<Trade[]> {
    const posKey = getPositionKey(position)
    const tradeIds = positionTradesMap.value.get(posKey)
    
    console.log('🔍 Getting attached trades for key:', posKey)
    console.log('🔍 Trade IDs from map:', tradeIds ? Array.from(tradeIds) : 'none')
    
    if (!tradeIds || tradeIds.size === 0) {
      return []
    }
    
    // Get symbol root from position
    const symbolRoot = extractSymbolRoot(position.symbol)
    if (!symbolRoot) return []
    
    // Fetch all trades for this symbol root
    const allTrades = await fetchTradesForSymbol(symbolRoot, position.internal_account_id)
    
    console.log(`📊 Total trades fetched: ${allTrades.length}`)
    console.log(`📊 Sample trade IDs:`, allTrades.slice(0, 3).map(t => t.tradeID))
    
    // Filter to only attached trades - use 'id' field from trades table
    const attachedTrades = allTrades.filter((t: Trade) => {
      // Try both 'id' and 'tradeID' fields
      const id = t.tradeID
      return id && tradeIds.has(String(id))
    })
    
    console.log(`✅ Found ${attachedTrades.length} attached trades`)
    
    return attachedTrades
  }
  
  // Fetch attached positions for display
  async function fetchAttachedPositionsForDisplay(
    position: any,
    attachedKeys: Set<string>
  ): Promise<Position[]> {
    try {
      const posKey = getPositionKey(position)
      
      // Check cache first
      if (attachedPositionsCache.value.has(posKey)) {
        return attachedPositionsCache.value.get(posKey) || []
      }

      const symbolRoot = extractSymbolRoot(position.symbol)
      const accountId = position.internal_account_id || position.legal_entity
      
      if (!symbolRoot || !accountId || !userId) return []

      const allPositions = await fetchPositionsBySymbolRoot(
        supabase,
        symbolRoot,
        userId,
        accountId
      )
      
      const attachedPositions = allPositions.filter(pos => {
        const key = getPositionKey(pos)
        return attachedKeys.has(key)
      })

      if (attachedPositions.length > 0) {
        attachedPositionsCache.value.set(posKey, attachedPositions)
      }
      
      return attachedPositions
    } catch (error) {
      console.error('❌ Error fetching attached positions:', error)
      return []
    }
  }
  
  // Computed to check if queries are ready
  const isReady = computed(() => {
    return positionTradeMappingsQuery.isSuccess.value && 
           positionPositionMappingsQuery.isSuccess.value
  })
  
  return {
    positionTradesMap,
    positionPositionsMap,
    getPositionKey,
    getAttachedTrades,
    fetchAttachedPositionsForDisplay,
    positionTradeMappingsQuery,
    positionPositionMappingsQuery,
    isReady,
    refetchMappings: async () => {
      await positionTradeMappingsQuery.refetch()
      await positionPositionMappingsQuery.refetch()
    }
  }
}
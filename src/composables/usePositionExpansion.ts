import { ref } from 'vue'

export function usePositionExpansion() {
  const expandedPositions = ref<Set<string>>(new Set())
  const processingPositions = ref<Set<string>>(new Set())
  
  function togglePositionExpansion(positionKey: string, tabulatorInstance: any) {
    processingPositions.value.delete(positionKey)
    
    if (expandedPositions.value.has(positionKey)) {
      expandedPositions.value.delete(positionKey)
    } else {
      expandedPositions.value.add(positionKey)
    }
    
    // Force row reformat
    // Handle both ref and direct tabulator instance
    const tabulator = tabulatorInstance?.value || tabulatorInstance
    
    if (tabulator && typeof tabulator.getRows === 'function') {
      const rows = tabulator.getRows()
      for (const row of rows) {
        const data = row.getData()
        if (data) {
          // Generate position key from row data
          const rowPosKey = `${data.internal_account_id || data.legal_entity}|${data.symbol}|${data.accounting_quantity || data.contract_quantity}|${data.asset_class || 'OPT'}|${data.conid || ''}`
          if (rowPosKey === positionKey) {
            row.reformat()
            break
          }
        }
      }
    }
  }
  
  return {
    expandedPositions,
    processingPositions,
    togglePositionExpansion
  }
}
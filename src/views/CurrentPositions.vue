<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import type { ColumnDefinition } from 'tabulator-tables'
import { useCurrentPositionQuery } from '@y2kfund/core/currentPositionsForSingleInstrument'
import { usePutPositionsQuery } from '@y2kfund/core/putPositionsForSingleInstrument'
import { useCallPositionsQuery } from '@y2kfund/core/callPositionsForSingleInstrument'
import { useTabulator } from '../composables/useTabulator'
import { useMarketPrice } from '../composables/useMarketPrice'
import { useAverageCostPrice } from '../composables/useAverageCostPrice'
import { useProfitAndLoss } from '../composables/useProfitAndLoss'
import { useAttachedData } from '../composables/useAttachedData'
import { usePositionExpansion } from '../composables/usePositionExpansion'
import { TabulatorFull as Tabulator } from 'tabulator-tables'

interface currentPositionsProps {
  symbolRoot: string
  userId?: string | null
}

const props = withDefaults(defineProps<currentPositionsProps>(), {
  symbolRoot: 'MSFT',
  userId: '4fbec15d-2316-4805-b2a4-5cd2115a5ac8'
})

// State for showing/hiding details
const showDetails = ref(false)
const showCalculationDetails = ref(false)
const showPnLDetails = ref(false)

// State for collapsing/expanding individual position groups
const expandedGroups = ref<Set<number>>(new Set())

// Toggle individual group expansion
function toggleGroupExpansion(groupIndex: number) {
  if (expandedGroups.value.has(groupIndex)) {
    expandedGroups.value.delete(groupIndex)
  } else {
    expandedGroups.value.add(groupIndex)
  }
  // Force reactivity
  expandedGroups.value = new Set(expandedGroups.value)
}

// Fetch positions data
const { data: positions, isLoading, isError, error, isSuccess, _cleanup } = useCurrentPositionQuery(
  props.userId,
  props.symbolRoot
)

// Fetch PUT positions
const { data: putPositions } = usePutPositionsQuery(props.symbolRoot, props.userId)

// Fetch CALL positions
const { data: callPositions } = useCallPositionsQuery(props.symbolRoot, props.userId)

// Get conid from first position (convert string to number)
const firstConid = computed(() => {
  const conidStr = positions.value?.[0]?.conid
  return conidStr ? parseInt(conidStr, 10) : null
})

// Fetch market price using the composable
const { marketData, isLoading: isPriceLoading, error: priceError } = useMarketPrice(firstConid)

// Extract current market price from marketData
const currentMarketPrice = computed(() => marketData.value?.market_price ?? null)
const last_fetched_at_market_price = computed(() => marketData.value?.last_fetched_at ?? null)

// Format the timestamp for display with timezone
const formattedTimestamp = computed(() => {
  if (!last_fetched_at_market_price.value) return null
  
  const date = new Date(last_fetched_at_market_price.value)
  
  // Get timezone
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  
  // Format: Nov 11, 2025 at 08:53:02 PM IST
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: timeZone,
    timeZoneName: 'short'
  }
  
  const formatted = date.toLocaleString('en-US', options)
  
  // Replace GMT+5:30 with IST for India timezone
  let result = formatted.replace(/,(\s+\d)/, ' $1')
  result = result.replace('GMT+5:30', 'IST')
  result = result.replace('GMT+530', 'IST')
  
  return result
})

// Fetch average cost price using the composable
const { 
  averageCostPrice,
  overallAdjustedAvgPrice,
  totalCost, 
  totalQuantity, 
  mainPositionsCount, 
  attachedPositionsCount,
  positionBreakdown,
  positionGroups,
  isLoading: isAvgPriceLoading, 
  error: avgPriceError 
} = useAverageCostPrice(
  positions,
  props.userId
)

// Use attached data composable
const {
  positionTradesMap,
  positionPositionsMap,
  getPositionKey,
  getAttachedTrades,
  fetchAttachedPositionsForDisplay,
  isReady
} = useAttachedData(props.userId)

// Use expansion composable
const {
  expandedPositions,
  processingPositions,
  togglePositionExpansion: toggleExpansion
} = usePositionExpansion()

// Detect asset type (STK or OPT)
const assetType = computed(() => {
  // First check main positions (stocks)
  if (positions.value && positions.value.length > 0) {
    const firstAsset = positions.value[0]?.asset_class
    console.log('👀 Asset type from positions:', firstAsset)
    return firstAsset || null
  }
  
  // If no stock positions, check if we have options positions
  const hasPutPositions = putPositions.value && putPositions.value.length > 0
  const hasCallPositions = callPositions.value && callPositions.value.length > 0
  
  if (hasPutPositions || hasCallPositions) {
    const optionAsset = putPositions.value?.[0]?.asset_class || callPositions.value?.[0]?.asset_class
    console.log('👀 Asset type from options:', optionAsset)
    return optionAsset || 'OPT'
  }
  
  console.log('👀 Asset type: null (no positions)')
  return null
})
console.log('👀 Asset type detected:', assetType.value)

// Calculate totals
const totalContractQuantity = computed(() => {
  if (!positions.value || positions.value.length === 0) return 0
  return positions.value.reduce((sum, pos) => sum + (pos.contract_quantity || 0), 0)
})

const totalUnrealizedPL = computed(() => {
  // For options, calculate from PUT and CALL positions
  if (assetType.value === 'OPT') {
    const putPnL = putPositions.value?.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0) || 0
    const callPnL = callPositions.value?.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0) || 0
    console.log('📊 Options Unrealized P&L - PUT:', putPnL, 'CALL:', callPnL, 'Total:', putPnL + callPnL)
    return putPnL + callPnL
  }
  
  // For stocks, calculate from positions
  if (!positions.value || positions.value.length === 0) return 0
  const stockPnL = positions.value.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0)
  console.log('📊 Stock Unrealized P&L:', stockPnL)
  return stockPnL
})

// Computed values for overall calculation breakdown
const totalNetCostAllClients = computed(() => {
  return positionGroups.value.reduce((sum, g) => sum + g.netCostExcludingPuts, 0)
})

const totalMainQuantityAllClients = computed(() => {
  return positionGroups.value.reduce((sum, g) => sum + g.mainPosition.quantity, 0)
})

// Use single P&L composable that handles both stocks and options
const {
  totalCostBasis,
  currentMarketValue,
  unrealizedPnL,
  pnlPercentage,
  isProfitable,
  calculationBreakdown,
  isLoading: isPnLLoading,
  error: pnlError
} = useProfitAndLoss(
  overallAdjustedAvgPrice,
  totalMainQuantityAllClients,
  currentMarketPrice,
  putPositions,
  callPositions
)

// Helper functions
function extractTagsFromSymbol(symbolText: string): string[] {
  if (!symbolText) return []
  const text = String(symbolText)
  const symMatch = text.match(/^([A-Z]+)\b/)
  const base = symMatch?.[1] ?? ''
  const rightMatch = text.match(/\s([CP])\b/)
  const right = rightMatch?.[1] ?? ''
  const strikeMatch = text.match(/\s(\d+(?:\.\d+)?)\s+[CP]\b/)
  const strike = strikeMatch?.[1] ?? ''
  const codeMatch = text.match(/\b(\d{6})[CP]/)
  const expiry = codeMatch ? formatExpiryFromYyMmDd(codeMatch[1]) : ''
  return [base, expiry, strike, right].filter(Boolean)
}

function extractTagsFromTradesSymbol(symbolText: string): string[] {
  if (!symbolText) return []
  const text = String(symbolText).trim()
  
  const symMatch = text.match(/^([A-Z]+)\s*/)
  const base = symMatch?.[1] ?? ''
  
  const remaining = text.slice(symMatch?.[0]?.length || 0)
  
  const expiryMatch = remaining.match(/(\d{6})([CP])/)
  let expiry = ''
  let right = ''
  let strike = ''
  
  if (expiryMatch) {
    expiry = formatExpiryFromYyMmDd(expiryMatch[1])
    right = expiryMatch[2] === 'C' ? 'Call' : 'Put'
    
    const afterExpiry = remaining.slice(expiryMatch[0].length)
    const strikeMatch = afterExpiry.match(/(\d+)/)
    if (strikeMatch) {
      const strikeValue = parseInt(strikeMatch[1], 10) / 1000
      strike = strikeValue.toString()
    }
  }
  
  return [base, expiry, strike, right].filter(Boolean)
}

function formatExpiryFromYyMmDd(code: string): string {
  if (!code || code.length !== 6) return ''
  const yy = code.substring(0, 2)
  const mm = code.substring(2, 4)
  const dd = code.substring(4, 6)
  return `20${yy}-${mm}-${dd}`
}

function formatTradeDate(dateStr: string): string {
  if (!dateStr) return ''
  
  // Check if it's in DD/MM/YYYY format (day first)
  const ddmmyyyyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(dateStr).trim())
  let dt: Date
  
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1])      // First number is day
    const month = parseInt(ddmmyyyyMatch[2]) - 1 // Second number is month (0-indexed)
    let year = parseInt(ddmmyyyyMatch[3])
    if (year < 100) {
      year = 2000 + year
    }
    dt = new Date(year, month, day)
  } else {
    // Try parsing as ISO date or other format
    dt = new Date(dateStr)
    if (isNaN(dt.getTime())) return String(dateStr)
  }
  
  // Format as YYYY-MM-DD
  const year = dt.getFullYear()
  const month = (dt.getMonth() + 1).toString().padStart(2, '0')
  const day = dt.getDate().toString().padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

function togglePositionExpansion(positionKey: string) {
  console.log('🔄 Toggle expansion for key:', positionKey)
  console.log('📊 Before toggle - expanded positions:', Array.from(expandedPositions.value))
  
  // Toggle the expansion state
  if (expandedPositions.value.has(positionKey)) {
    expandedPositions.value.delete(positionKey)
    console.log('➖ Removed from expanded')
  } else {
    expandedPositions.value.add(positionKey)
    console.log('➕ Added to expanded')
  }
  
  console.log('📊 After toggle - expanded positions:', Array.from(expandedPositions.value))
  console.log('🎯 Tabulator exists?', !!tabulator.value)
  
  // Force row reformat
  if (tabulator.value) {
    const rows = tabulator.value.getRows()
    console.log('📋 Total rows:', rows.length)
    
    for (const row of rows) {
      const data = row.getData()
      if (data) {
        const rowPosKey = getRowPositionKey(data)
        console.log('🔍 Checking row key:', rowPosKey, 'matches?', rowPosKey === positionKey)
        
        if (rowPosKey === positionKey) {
          console.log('✅ Found matching row, reformatting...')
          row.reformat()
          break
        }
      }
    }
  }
}

// Wrapper to get position key with current data
function getRowPositionKey(data: any): string {
  return getPositionKey(data)
}

// Define Tabulator columns with expansion support
const columns: ColumnDefinition[] = [
  {
    title: 'Account',
    field: 'legal_entity',
    minWidth: 150,
    headerHozAlign: 'left',
    formatter: (cell: any) => {
      const data = cell.getRow().getData()
      const accountName = cell.getValue() || data.internal_account_id
      
      // Check if mappings are ready
      if (!isReady.value) {
        console.log('⏳ Formatter called but mappings not ready yet')
        return `<div style="display: flex; align-items: center; gap: 6px;">
          <span class="expand-arrow">&nbsp;</span>
          <span>${accountName}</span>
        </div>`
      }
      
      const posKey = getRowPositionKey(data)
      const attachedTradeIds = positionTradesMap.value.get(posKey)
      const attachedPositionKeys = positionPositionsMap.value.get(posKey)
      
      console.log('🎨 Formatter for', posKey, {
        attachedTradeIds: attachedTradeIds?.size || 0,
        attachedPositionKeys: attachedPositionKeys?.size || 0,
        isReady: isReady.value
      })
      
      const hasAttachments = (attachedTradeIds && attachedTradeIds.size > 0) || 
                            (attachedPositionKeys && attachedPositionKeys.size > 0)
      const isExpanded = expandedPositions.value.has(posKey)
      
      const expandArrow = hasAttachments
        ? `<span class="expand-arrow ${isExpanded ? 'expanded' : ''}" data-position-key="${posKey}" title="${isExpanded ? 'Collapse' : 'Expand'} attachments">
            ${isExpanded ? '▼' : '▶'}
          </span>`
        : '<span class="expand-arrow">&nbsp;</span>'
      
      const totalAttachments = (attachedTradeIds?.size || 0) + (attachedPositionKeys?.size || 0)
      const attachmentLabel = totalAttachments > 0 
        ? `<span class="trade-count">(${totalAttachments})</span>`
        : ''
      
      return `
        <div style="display: flex; align-items: center; gap: 6px;">
          ${expandArrow}
          <span>${accountName}</span>
          ${attachmentLabel}
        </div>
      `
    },
    cellClick: (e: any, cell: any) => {
      const target = e.target as HTMLElement
      
      const expandArrow = target.closest('.expand-arrow')
      if (expandArrow) {
        e.stopPropagation()
        const posKey = expandArrow.getAttribute('data-position-key')
        if (posKey) {
          togglePositionExpansion(posKey)
        }
        return
      }
    }
  },
  {
    title: 'Accounting Qty',
    field: 'accounting_quantity',
    minWidth: 100,
    hozAlign: 'right',
    headerHozAlign: 'right',
    formatter: 'money',
    formatterParams: {
      decimal: '.',
      thousand: ',',
      precision: 0
    },
    bottomCalc: 'sum',
    bottomCalcFormatter: 'money',
    bottomCalcFormatterParams: {
      decimal: '.',
      thousand: ',',
      precision: 0
    }
  },
  {
    title: 'Avg Price',
    field: 'avgPrice',
    minWidth: 100,
    hozAlign: 'right',
    headerHozAlign: 'right',
    formatter: (cell: any) => {
      const value = cell.getValue()
      return value != null ? '$' + Number(value).toFixed(2) : ''
    }
  },
  {
    title: 'Market Price',
    field: 'price',
    minWidth: 100,
    hozAlign: 'right',
    headerHozAlign: 'right',
    formatter: (cell: any) => {
      const value = cell.getValue()
      return value != null ? '$' + Number(value).toFixed(2) : ''
    }
  },
  {
    title: 'Market Value',
    field: 'market_value',
    minWidth: 150,
    hozAlign: 'right',
    headerHozAlign: 'right',
    formatter: (cell: any) => {
      const value = cell.getValue()
      if (value == null) return ''
      const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
      return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
    },
    bottomCalc: 'sum',
    bottomCalcFormatter: (cell: any) => {
      const value = cell.getValue()
      const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
      return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
    }
  },
  {
    title: 'Unrealized P&L',
    field: 'unrealized_pnl',
    minWidth: 150,
    hozAlign: 'right',
    headerHozAlign: 'right',
    formatter: (cell: any) => {
      const value = cell.getValue()
      if (value == null) return ''
      const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
      return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
    },
    bottomCalc: 'sum',
    bottomCalcFormatter: (cell: any) => {
      const value = cell.getValue()
      const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
      return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
    }
  },
  {
    title: 'Entry Cash Flow',
    field: 'computed_cash_flow_on_entry',
    minWidth: 100,
    hozAlign: 'right',
    headerHozAlign: 'right',
    formatter: (cell: any) => {
      const value = cell.getValue()
      if (value == null) return ''
      const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
      return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
    }
  }
]

// Initialize Tabulator with row formatter
const { tableDiv, initializeTabulator, isTableInitialized, tabulator } = useTabulator({
  data: positions,
  columns,
  isSuccess,
  placeholder: 'No positions found for this symbol',
  rowFormatter: async (row: any) => {
    try {
      const data = row.getData()
      const element = row.getElement()
      
      if (!data) return

      const posKey = getRowPositionKey(data)
      const attachedTradeIds = positionTradesMap.value.get(posKey)
      const attachedPositionKeys = positionPositionsMap.value.get(posKey)
      const isExpanded = expandedPositions.value.has(posKey)
      
      console.log('🎨 Row formatter running for:', posKey, {
        isExpanded,
        attachedTradeIds: attachedTradeIds?.size || 0,
        attachedPositionKeys: attachedPositionKeys?.size || 0,
        processing: processingPositions.value.has(posKey)
      })
      
      const existingNested = element.querySelector('.nested-tables-container')
      if (existingNested) {
        console.log('🗑️ Removing existing nested container')
        existingNested.remove()
      }

      if (processingPositions.value.has(posKey)) {
        console.log('⏸️ Position is being processed, skipping')
        return
      }

      if (isExpanded && (
        (attachedTradeIds && attachedTradeIds.size > 0) || 
        (attachedPositionKeys && attachedPositionKeys.size > 0)
      )) {
        console.log('📦 Creating nested tables for:', posKey)
        processingPositions.value.add(posKey)
        
        try {
          const container = document.createElement('div')
          container.className = 'nested-tables-container'
          container.style.cssText = 'padding: 1rem; background: #f8f9fa; border-top: 1px solid #dee2e6;'

          // Add Trades section
          if (attachedTradeIds && attachedTradeIds.size > 0) {
            console.log('📊 Adding trades section')
            const tradesTitle = document.createElement('h4')
            tradesTitle.textContent = `Attached Trades (${attachedTradeIds.size})`
            tradesTitle.style.cssText = 'margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #495057;'
            container.appendChild(tradesTitle)

            const tradesTableDiv = document.createElement('div')
            tradesTableDiv.className = 'nested-trades-table'
            tradesTableDiv.style.cssText = 'margin-bottom: 1rem;'
            container.appendChild(tradesTableDiv)

            const tradesData = await getAttachedTrades(data)
            console.log('✅ Got trades data:', tradesData.length)

            new Tabulator(tradesTableDiv, {
              data: tradesData,
              layout: 'fitColumns',
              columns: [
                { 
                  title: 'Financial instruments', 
                  field: 'symbol', 
                  widthGrow: 1.8,
                  formatter: (cell: any) => {
                    const tags = extractTagsFromTradesSymbol(cell.getValue())
                    return tags.map(tag => `<span class="fi-tag">${tag}</span>`).join(' ')
                  }
                },
                { 
                  title: 'Side', 
                  field: 'buySell', 
                  widthGrow: 1,
                  formatter: (cell: any) => {
                    const side = cell.getValue()
                    const className = side === 'BUY' ? 'trade-buy' : 'trade-sell'
                    return `<span class="trade-side-badge ${className}">${side}</span>`
                  }
                },
                { 
                  title: 'Open/Close', 
                  field: 'openCloseIndicator', 
                  widthGrow: 1,
                  formatter: (cell: any) => {
                    const value = cell.getValue()
                    if (value === 'O') return '<span style="color: #17a2b8; font-weight: bold;">OPEN</span>'
                    if (value === 'C') return '<span style="color: #6f42c1; font-weight: bold;">CLOSE</span>'
                    return value
                  }
                },
                { 
                  title: 'Trade Date', 
                  field: 'tradeDate', 
                  widthGrow: 1,
                  formatter: (cell: any) => formatTradeDate(cell.getValue())
                },
                { 
                  title: 'Settlement Date', 
                  field: 'settleDateTarget', 
                  widthGrow: 1,
                  formatter: (cell: any) => formatTradeDate(cell.getValue())
                },
                { 
                  title: 'Quantity', 
                  field: 'quantity', 
                  widthGrow: 1,
                  hozAlign: 'right',
                  formatter: (cell: any) => {
                    const row = cell.getRow().getData()
                    const q = parseFloat(row?.quantity || 0) || 0
                    const m = parseFloat(row?.multiplier || 1) || 1
                    const effective = q * m
                    return formatNumber(effective)
                  }
                },
                { 
                  title: 'Price', 
                  field: 'tradePrice', 
                  widthGrow: 1,
                  hozAlign: 'right',
                  formatter: (cell: any) => formatCurrency(parseFloat(cell.getValue()) || 0)
                },
                { 
                  title: 'Total Premium', 
                  field: 'tradeMoney', 
                  widthGrow: 1,
                  hozAlign: 'right',
                  formatter: (cell: any) => formatCurrency(parseFloat(cell.getValue()) || 0)
                },
                { 
                  title: 'Net Cash', 
                  field: 'netCash', 
                  widthGrow: 1,
                  hozAlign: 'right',
                  formatter: (cell: any) => formatCurrency(parseFloat(cell.getValue()) || 0)
                },
                { 
                  title: 'MTM PnL', 
                  field: 'mtmPnl', 
                  widthGrow: 1,
                  hozAlign: 'right',
                  formatter: (cell: any) => formatCurrency(parseFloat(cell.getValue()) || 0)
                },
                { 
                  title: 'Close Price', 
                  field: 'closePrice', 
                  widthGrow: 1,
                  hozAlign: 'right',
                  formatter: (cell: any) => formatCurrency(parseFloat(cell.getValue()) || 0)
                }
              ]
            })
          }

          // Add Positions section
          if (attachedPositionKeys && attachedPositionKeys.size > 0) {
            console.log('📊 Adding positions section')
            const positionsTitle = document.createElement('h4')
            positionsTitle.textContent = `Attached Positions (${attachedPositionKeys.size})`
            positionsTitle.style.cssText = 'margin: 1rem 0 0.5rem 0; font-size: 0.9rem; color: #495057;'
            container.appendChild(positionsTitle)

            const positionsTableDiv = document.createElement('div')
            positionsTableDiv.className = 'nested-positions-table'
            container.appendChild(positionsTableDiv)

            const attachedPositionsData = await fetchAttachedPositionsForDisplay(data, attachedPositionKeys)
            console.log('✅ Got positions data:', attachedPositionsData.length)

            new Tabulator(positionsTableDiv, {
              data: attachedPositionsData,
              layout: 'fitColumns',
              columns: [
                { 
                  title: 'Financial instruments', 
                  field: 'symbol', 
                  widthGrow: 1.8,
                  formatter: (cell: any) => {
                    const tags = extractTagsFromSymbol(cell.getValue())
                    return tags.map(tag => `<span class="fi-tag">${tag}</span>`).join(' ')
                  }
                },
                {
                  title: 'Accounting Qty',
                  field: 'accounting_quantity',
                  widthGrow: 1,
                  hozAlign: 'right',
                  formatter: 'money',
                  formatterParams: {
                    decimal: '.',
                    thousand: ',',
                    precision: 0
                  }
                },
                {
                  title: 'Avg Price',
                  field: 'avgPrice',
                  widthGrow: 1,
                  hozAlign: 'right',
                  formatter: (cell: any) => {
                    const value = cell.getValue()
                    if (value == null) return ''
                    const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
                    return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
                  }
                },
                { 
                  title: 'Market Value', 
                  field: 'market_value', 
                  widthGrow: 1.5,
                  hozAlign: 'right',
                  formatter: (cell: any) => {
                    const value = cell.getValue()
                    if (value == null) return ''
                    const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
                    return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
                  }
                },
                { 
                  title: 'Unrealized P&L', 
                  field: 'unrealized_pnl', 
                  widthGrow: 1.5,
                  hozAlign: 'right',
                  formatter: (cell: any) => {
                    const value = cell.getValue()
                    if (value == null) return ''
                    const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
                    return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
                  }
                },
                { 
                  title: 'Entry Cash Flow', 
                  field: 'computed_cash_flow_on_entry', 
                  widthGrow: 1,
                  hozAlign: 'right',
                  formatter: (cell: any) => {
                    const value = cell.getValue()
                    if (value == null) return ''
                    const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
                    return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
                  }
                }
              ]
            })
          }

          console.log('✅ Appending nested container to row')
          element.appendChild(container)
        } catch (error) {
          console.error('❌ Error creating nested tables:', error)
        } finally {
          setTimeout(() => {
            processingPositions.value.delete(posKey)
            console.log('✅ Removed from processing')
          }, 100)
        }
      } else {
        console.log('ℹ️ Row not expanded or no attachments')
      }
    } catch (error) {
      console.error('❌ Row formatter error:', error)
    }
  }
})

function toggleDetails() {
  showDetails.value = !showDetails.value
  
  // Initialize table when showing details
  if (showDetails.value && !isTableInitialized.value && positions.value && positions.value.length > 0) {
    console.log('📊 Details shown, initializing table...')
    nextTick(() => {
      initializeTabulator()
    })
  }
}

function toggleCalculationDetails() {
  showCalculationDetails.value = !showCalculationDetails.value
}

function togglePnLDetails() {
  showPnLDetails.value = !showPnLDetails.value
}

// Watch for when mappings become ready and redraw the table
watch(isReady, async (ready) => {
  console.log('👀 Mappings ready state changed:', ready)
  
  if (ready && tabulator.value && isTableInitialized.value) {
    console.log('🔄 Redrawing table with mappings')
    tabulator.value.redraw(true)
  }
}, { immediate: true })

// Watch for showDetails becoming true to initialize table
watch(showDetails, async (show) => {
  if (show && !isTableInitialized.value && positions.value && positions.value.length > 0) {
    console.log('📊 Details shown via watch, initializing table...')
    await nextTick()
    initializeTabulator()
  }
})

onMounted(() => {
  console.log('📊 CurrentPositions component mounted')
})

onBeforeUnmount(() => {
  console.log('🧹 Cleaning up CurrentPositions component')
  _cleanup()
})
</script>

<template>
  <div class="current-positions-for-single-instrument-view">
    <div class="positions-table-container">
      <div class="header-section">
        <h2>Current Positions for {{ props.symbolRoot }} Across All Accounts</h2>
        
        <!-- Loading State -->
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading positions for {{ props.symbolRoot }}...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="isError" class="error-state">
          <p>❌ Error loading positions: {{ error?.message }}</p>
        </div>

        <!-- Summary Cards (Always Visible) -->
        <div v-else class="summary-section">
          <div class="summary-cards">
            <div class="summary-card card-blue">
              <div class="summary-label">Profit and Loss</div>
              <div v-if="isPnLLoading" class="summary-value">
                <span class="loading-spinner">⏳</span> Loading...
              </div>
              <div v-else-if="pnlError" class="summary-value error">
                ❌ Error
              </div>
              <div v-else class="summary-value-container-vertical">
                <div 
                  class="summary-value clickable-price pnl-value" 
                  :class="{ 'profit': isProfitable, 'loss': !isProfitable }"
                  @click="togglePnLDetails"
                >
                  <span v-if="unrealizedPnL !== null">
                    {{ unrealizedPnL >= 0 ? '+' : '' }}${{ unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    <span class="pnl-percentage">({{ pnlPercentage?.toFixed(2) }}%)</span>
                  </span>
                  <span v-else>N/A</span>
                  <span class="toggle-icon">{{ showPnLDetails ? '▼' : '▶' }}</span>
                </div>
              </div>
            </div>
            
            <div class="summary-card highlight-1 card-green">
              <div class="summary-label">Total Contract Quantity</div>
              <div class="summary-value-container">
                <div class="summary-value">{{ totalContractQuantity.toLocaleString() }}</div>
                <div class="accounts-count">
                  <span
                    class="clickable-accounts"
                    title="Show positions table for all accounts"
                    @click.stop="toggleDetails"
                    style="cursor:pointer; color: #0d6efd;"
                  >
                    ({{ positions?.length || 0 }})
                  </span>
                </div>
              </div>
            </div>

            <div class="summary-card card-purple">
              <div class="summary-label">Current market price of {{ props.symbolRoot }}</div>
              <div v-if="isPriceLoading" class="summary-value">
                <span class="loading-spinner">⏳</span> Loading...
              </div>
              <div v-else-if="priceError" class="summary-value error">
                ❌ Error
              </div>
              <div v-else-if="currentMarketPrice !== null" class="summary-value-container-vertical">
                <div class="summary-value">
                  ${{ currentMarketPrice.toFixed(2) }}
                </div>
                <div v-if="formattedTimestamp" class="timestamp-info">
                  Updated: {{ formattedTimestamp }}
                </div>
              </div>
              <div v-else class="summary-value">
                N/A
              </div>
            </div>

            <div class="summary-card card-orange">
              <div class="summary-label">Adjusted average cost price of {{ props.symbolRoot }} per share</div>
              <div v-if="isAvgPriceLoading" class="summary-value">
                <span class="loading-spinner">⏳</span> Loading...
              </div>
              <div v-else-if="avgPriceError" class="summary-value error">
                ❌ Error
              </div>
              <div class="summary-value-container-vertical">
                <div class="summary-value average-cost-price clickable-price" @click="toggleCalculationDetails">
                  <span v-if="overallAdjustedAvgPrice !== null">
                  ${{ overallAdjustedAvgPrice.toFixed(2) }}
                  </span>
                  <span v-else>N/A</span>
                  <span class="toggle-icon">{{ showCalculationDetails ? '▼' : '▶' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tabulator Table (Collapsible) -->
          <transition name="slide-fade">
            <div v-show="showDetails" class="table-wrapper">
              <div ref="tableDiv"></div>
            </div>
          </transition>

          <!-- Calculation Details Section (Collapsible) -->
          <transition name="slide-fade">
            <div v-show="showCalculationDetails" class="calculation-details">
              <!-- Group by main position + its attached positions -->
               <h2>Average Price calculation details :</h2>
              <div v-for="(group, groupIndex) in positionGroups" :key="`group-${groupIndex}`" class="position-group">
                <div class="group-header clickable" @click="toggleGroupExpansion(groupIndex)">
                  <span class="toggle-icon">{{ expandedGroups.has(groupIndex) ? '▼' : '▶' }}</span>
                  Client {{ groupIndex + 1 }}: {{ group.mainPosition.account }}
                </div>
                
                <!-- Collapsible Content -->
                <transition name="slide-fade">
                  <div v-show="expandedGroups.has(groupIndex)" class="group-content">
                
                <!-- Main position -->
                <div class="position-line main-position">
                  <span class="position-icon">📍</span>
                  <span class="position-symbol">{{ group.mainPosition.symbol }}</span>
                  <span class="position-calc">@ ${{ group.mainPosition.avgPrice.toFixed(2) }} × {{ group.mainPosition.quantity.toLocaleString() }} = ${{ group.mainPosition.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                </div>
                
                <!-- Call positions (if any) -->
                <div v-if="group.callPositions.length > 0" class="call-positions-wrapper">
                  <div class="call-header">📞 Call Positions (subtract from cost)</div>
                  <div v-for="(pos, posIndex) in group.callPositions" :key="`call-${groupIndex}-${posIndex}`" class="position-line call-position">
                    <span class="position-icon"></span>
                    <span class="position-symbol">{{ pos.symbol }}</span>
                    <span class="position-calc">@ ${{ pos.avgPrice.toFixed(2) }} × {{ pos.quantity.toLocaleString() }} = ${{ pos.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                  </div>
                  <div class="call-subtotal">
                    Subtotal Calls: ${{ Math.abs(group.callPositionsTotalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </div>
                </div>
                
                <!-- Put positions (for display only, not included in calculation) -->
                <div v-if="group.putPositions.length > 0" class="put-positions-wrapper">
                  <div class="put-header">📉 Put Positions (display only, not in calculation)</div>
                  <div v-for="(pos, posIndex) in group.putPositions" :key="`put-${groupIndex}-${posIndex}`" class="position-line put-position">
                    <span class="position-icon">📉</span>
                    <span class="position-symbol">{{ pos.symbol }}</span>
                    <span class="position-calc">@ ${{ pos.avgPrice.toFixed(2) }} × {{ pos.quantity.toLocaleString() }} = ${{ pos.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                  </div>
                </div>
                
                <!-- Calculation summary for this client -->
                <div class="group-calculation">
                  <div class="calc-line">📊 <strong>Calculation:</strong></div>
                  <div class="calc-line indent">Net Cost = ${{ group.mainPosition.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(group.callPositionsTotalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} = ${{ group.netCostExcludingPuts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent"><strong>Adjusted Avg Price = ${{ group.netCostExcludingPuts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ {{ group.mainPosition.quantity.toLocaleString() }} = ${{ group.adjustedAvgPricePerShare.toFixed(2) }} per share</strong></div>
                </div>
                
                  </div>
                </transition>
              </div>

              <!-- Overall adjusted average at the top -->
              <div v-if="overallAdjustedAvgPrice !== null" class="overall-adjusted-section">
                <div class="overall-adjusted-header">
                  🎯 Overall Adjusted Average: ${{ overallAdjustedAvgPrice.toFixed(2) }} per share
                </div>
                <div class="overall-calculation-breakdown">
                  <div class="breakdown-line">Total Net Cost = {{ positionGroups.map((g: any, i: any) => `$${g.netCostExcludingPuts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' + ') }} = ${{ totalNetCostAllClients.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="breakdown-line">Total Main Qty = {{ positionGroups.map((g: any) => g.mainPosition.quantity.toLocaleString()).join(' + ') }} = {{ totalMainQuantityAllClients.toLocaleString() }}</div>
                  <div class="breakdown-line"><strong>Overall Adjusted Average = ${{ totalNetCostAllClients.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ {{ totalMainQuantityAllClients.toLocaleString() }} = ${{ overallAdjustedAvgPrice.toFixed(2) }}</strong></div>
                </div>
              </div>

            </div>
          </transition>

          <!-- P&L Details Section (Collapsible) -->
          <transition name="slide-fade">
            <div v-show="showPnLDetails" class="pnl-details">
              <h2>Profit & Loss Calculation Details:</h2>
              
              <!-- Stock P&L Breakdown -->
              <div v-if="calculationBreakdown && assetType === 'STK'" class="pnl-breakdown">
                <!-- Step 1: Total Cost Basis -->
                <div class="pnl-section">
                  <div class="pnl-section-title">📊 Total Cost Basis</div>
                  <div class="calc-line">
                    Total Shares = {{ calculationBreakdown.totalShares.toLocaleString() }}
                  </div>
                  <div class="calc-line">
                    Average Cost per Share = ${{ calculationBreakdown.avgCostPerShare.toFixed(2) }}
                  </div>
                  <div class="calc-line calculation-result">
                    <strong>Total Cost Basis = {{ calculationBreakdown.totalShares.toLocaleString() }} × ${{ calculationBreakdown.avgCostPerShare.toFixed(2) }} = ${{ calculationBreakdown.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
                  </div>
                </div>

                <!-- Step 2: Current Market Value -->
                <div class="pnl-section">
                  <div class="pnl-section-title">💰 Current Market Value</div>
                  <div class="calc-line">
                    Current Price per Share = ${{ calculationBreakdown.currentPricePerShare.toFixed(2) }}
                  </div>
                  <div class="calc-line calculation-result">
                    <strong>Current Market Value = {{ calculationBreakdown.totalShares.toLocaleString() }} × ${{ calculationBreakdown.currentPricePerShare.toFixed(2) }} = ${{ calculationBreakdown.currentMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
                  </div>
                </div>

                <!-- Step 3: Unrealized P&L -->
                <div class="pnl-section highlight-section">
                  <div class="pnl-section-title">🎯 Unrealized Profit & Loss</div>
                  <div class="calc-line">
                    <strong :class="{ 'profit-text': isProfitable, 'loss-text': !isProfitable }">
                      Unrealized P&L = ${{ calculationBreakdown.currentMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ calculationBreakdown.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} = {{ unrealizedPnL && unrealizedPnL >= 0 ? '+' : '' }}${{ calculationBreakdown.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </strong>
                  </div>
                  <div class="calc-line">
                    <strong :class="{ 'profit-text': isProfitable, 'loss-text': !isProfitable }">
                      P&L Percentage = ({{ unrealizedPnL && unrealizedPnL >= 0 ? '+' : '' }}${{ calculationBreakdown.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ ${{ calculationBreakdown.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}) × 100 = {{ calculationBreakdown.pnlPercentage.toFixed(2) }}%
                    </strong>
                  </div>
                </div>
              </div>

              <!-- Options P&L Breakdown -->
              <div v-if="calculationBreakdown && assetType === 'OPT'" class="pnl-breakdown">
                <div class="pnl-section">
                  <div class="pnl-section-title">📊 SHORT {{ calculationBreakdown.optionType }} OPTIONS SUMMARY</div>
                  <div class="calc-line">
                    Total Contracts: {{ calculationBreakdown.totalContracts.toLocaleString() }}
                  </div>
                  <div class="calc-line">
                    Position Type: {{ calculationBreakdown.positionType }}
                  </div>
                </div>

                <!-- Per-Position Breakdown -->
                <div v-for="(pos, idx) in calculationBreakdown.positions" :key="`pos-${idx}`" class="pnl-section">
                  <div class="pnl-section-title">Position {{ idx + 1 }}: {{ pos.account }} - ${{ pos.strike }} Strike ({{ pos.expiry }})</div>
                  <div class="calc-line">
                    Contracts Sold: {{ Math.abs(pos.quantity).toLocaleString() }}
                  </div>
                  <div class="calc-line">
                    Premium Received: ${{ pos.premiumReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </div>
                  <div class="calc-line">
                    Current Market Value: ${{ pos.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </div>
                  <div class="calc-line calculation-result">
                    <strong :class="{ 'profit-text': pos.positionPnL >= 0, 'loss-text': pos.positionPnL < 0 }">
                      P&L: {{ pos.positionPnL >= 0 ? '+' : '' }}${{ pos.positionPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </strong>
                  </div>
                </div>

                <!-- Total Calculation -->
                <div class="pnl-section highlight-section">
                  <div class="pnl-section-title">💰 TOTAL CALCULATION</div>
                  <div class="calc-line">
                    Total Premium Received = {{ calculationBreakdown.positions.map((p: any) => `$${p.premiumReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' + ') }}
                  </div>
                  <div class="calc-line calculation-result">
                    <strong>= ${{ calculationBreakdown.totalPremiumReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
                  </div>
                  
                  <div class="calc-line" style="margin-top: 1rem;">
                    Current Market Liability = {{ calculationBreakdown.positions.map((p: any) => `$${p.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' + ') }}
                  </div>
                  <div class="calc-line calculation-result">
                    <strong>= ${{ calculationBreakdown.currentMarketLiability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
                  </div>

                  <div class="calc-line" style="margin-top: 1rem;">
                    <strong :class="{ 'profit-text': isProfitable, 'loss-text': !isProfitable }">
                      Unrealized P&L = ${{ calculationBreakdown.totalPremiumReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ calculationBreakdown.currentMarketLiability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} = {{ unrealizedPnL && unrealizedPnL >= 0 ? '+' : '' }}${{ calculationBreakdown.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </strong>
                  </div>
                  
                  <div class="calc-line">
                    <strong :class="{ 'profit-text': isProfitable, 'loss-text': !isProfitable }">
                      P&L % = ({{ unrealizedPnL && unrealizedPnL >= 0 ? '+' : '' }}${{ calculationBreakdown.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ ${{ calculationBreakdown.totalPremiumReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}) × 100 = {{ calculationBreakdown.pnlPercentage.toFixed(2) }}%
                    </strong>
                  </div>
                  
                  <div v-if="calculationBreakdown.pnlPercentage < -50" class="calc-line" style="margin-top: 1rem; color: #dc3545; font-weight: bold;">
                    ⚠️ WARNING: Loss exceeds 50% of premium received!
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import 'tabulator-tables/dist/css/tabulator_modern.min.css';
@import '../styles/styles.css';
</style>

<style scoped>
@import '../styles/scoped-styles.css';
</style>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import type { ColumnDefinition } from 'tabulator-tables'
import { useCurrentPositionQuery } from '@y2kfund/core/currentPositionsForSingleInstrument'
import { useTabulator } from '../composables/useTabulator'
import { useMarketPrice } from '../composables/useMarketPrice'
import { useAverageCostPrice } from '../composables/useAverageCostPrice'

interface currentPositionsProps {
  symbolRoot: string
  userId?: string | null
}

const props = withDefaults(defineProps<currentPositionsProps>(), {
  symbolRoot: 'META',
  userId: '67e578fd-2cf7-48a4-b028-a11a3f89bb9b'
})

// State for showing/hiding details
const showDetails = ref(false)
const showCalculationDetails = ref(false)

// Fetch positions data
const { data: positions, isLoading, isError, error, isSuccess, _cleanup } = useCurrentPositionQuery(
  props.userId,
  props.symbolRoot
)

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

// Calculate totals
const totalContractQuantity = computed(() => {
  if (!positions.value || positions.value.length === 0) return 0
  return positions.value.reduce((sum, pos) => sum + (pos.contract_quantity || 0), 0)
})

const totalUnrealizedPL = computed(() => {
  if (!positions.value || positions.value.length === 0) return 0
  return positions.value.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0)  // Changed from unrealized_pl
})

// Computed values for overall calculation breakdown
const totalNetCostAllClients = computed(() => {
  return positionGroups.value.reduce((sum, g) => sum + g.netCostExcludingPuts, 0)
})

const totalMainQuantityAllClients = computed(() => {
  return positionGroups.value.reduce((sum, g) => sum + g.mainPosition.quantity, 0)
})

// Helper functions (same as put positions)
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

function formatExpiryFromYyMmDd(code: string): string {
  if (!code || code.length !== 6) return ''
  const yy = code.substring(0, 2)
  const mm = code.substring(2, 4)
  const dd = code.substring(4, 6)
  return `20${yy}-${mm}-${dd}`
}

// Define Tabulator columns (comprehensive list from put positions)
const columns: ColumnDefinition[] = [
  {
    title: 'Account',
    field: 'legal_entity',
    minWidth: 150,
    headerHozAlign: 'left'
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
    field: 'unrealized_pnl',  // Changed from 'unrealized_pl'
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

// Initialize Tabulator
const { tableDiv, isTabulatorReady } = useTabulator({
  data: positions,
  columns,
  isSuccess,
  layout: 'fitColumns',
  height: '600px',
  placeholder: 'No positions found for this symbol'
})

function toggleDetails() {
  showDetails.value = !showDetails.value
}

function toggleCalculationDetails() {
  showCalculationDetails.value = !showCalculationDetails.value
}

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
            <div class="summary-card clickable card-blue" @click="toggleDetails">
              <div class="summary-label">Total Accounts</div>
              <div class="summary-value-container">
                <div class="summary-value">{{ positions?.length || 0 }}</div>
                <div class="toggle-hint">
                  <span v-if="!showDetails">📊 Show Details</span>
                  <span v-else>📊 Hide Details</span>
                </div>
              </div>
            </div>
            
            <div class="summary-card highlight-1 card-green">
              <div class="summary-label">Total Contract Quantity</div>
              <div class="summary-value">{{ totalContractQuantity.toLocaleString() }}</div>
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
                <transition name="slide-fade">
                  <div v-show="showCalculationDetails" class="calculation-details">
                    <!-- Group by main position + its attached positions -->
                    <div v-for="(group, groupIndex) in positionGroups" :key="`group-${groupIndex}`" class="position-group">
                      <div class="group-header">Client {{ groupIndex + 1 }}: {{ group.mainPosition.account }}</div>
                      
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
              </div>
            </div>
          </div>

          <!-- Tabulator Table (Collapsible) - Changed v-if to v-show -->
          <transition name="slide-fade">
            <div v-show="showDetails" class="table-wrapper">
              <div ref="tableDiv"></div>
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
<script setup lang="ts">
import { ref } from 'vue'

interface OrderCalculation {
  symbol: string
  side: string
  quantity: number
  avgPrice: number
  totalCost: number
  secType: string
  right?: string
  strike?: number
  account: string
  orderDate: string
}

interface OrderGroup {
  mainPosition: {
    symbol: string
    account: string
    quantity: number
    avgPrice?: number
  }
  stockPurchases: OrderCalculation[]
  stockSales: OrderCalculation[]
  putSales: OrderCalculation[]
  putBuybacks: OrderCalculation[]
  callSales: OrderCalculation[]
  callBuybacks: OrderCalculation[]
  stockPurchaseCost: number
  totalStockCost: number
  stockSaleProceeds: number
  netStockCost: number
  putPremiumReceived: number
  putBuybackCost: number
  netPutCashFlow: number
  callPremiumReceived: number
  callBuybackCost: number
  netCallCashFlow: number
  netCost: number
  totalShares: number
  adjustedAvgPricePerShare: number
}

interface Props {
  showCalculationDetails: boolean
  avgPriceCalculationTab: 'hold-orders' | 'exit-orders'
  orderGroups: OrderGroup[]
  overallAdjustedAvgPriceFromOrders: number | null
  totalNetCost: number
  totalShares: number
  isAvgPriceFromOrdersLoading: boolean
  avgPriceFromOrdersError: string | null
  // Exit Today props
  orderGroupsExitToday: OrderGroup[]
  overallAdjustedAvgPriceFromOrdersExitToday: number | null
  totalNetCostExitToday: number
  totalSharesExitToday: number
  isAvgPriceFromOrdersLoadingExitToday: boolean
  avgPriceFromOrdersErrorExitToday: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:avgPriceCalculationTab': [value: 'hold-orders' | 'exit-orders']
}>()

// State for collapsing/expanding individual position groups
const expandedGroups = ref<Set<number>>(new Set())

// State for collapsing/expanding summary table rows
const expandedSummaryRows = ref<Set<number>>(new Set())

// State for showing detailed calculations within Hold panel
const expandedHoldDetails = ref<Set<number>>(new Set())

// State for showing detailed calculations within Exit panel
const expandedExitDetails = ref<Set<number>>(new Set())

// Toggle summary row expansion
function toggleSummaryRowExpansion(rowIndex: number) {
  if (expandedSummaryRows.value.has(rowIndex)) {
    expandedSummaryRows.value.delete(rowIndex)
  } else {
    expandedSummaryRows.value.add(rowIndex)
  }
  // Force reactivity
  expandedSummaryRows.value = new Set(expandedSummaryRows.value)
}

// Toggle detailed Hold calculation expansion
function toggleHoldDetails(rowIndex: number) {
  if (expandedHoldDetails.value.has(rowIndex)) {
    expandedHoldDetails.value.delete(rowIndex)
  } else {
    expandedHoldDetails.value.add(rowIndex)
  }
  expandedHoldDetails.value = new Set(expandedHoldDetails.value)
}

// Toggle detailed Exit calculation expansion
function toggleExitDetails(rowIndex: number) {
  if (expandedExitDetails.value.has(rowIndex)) {
    expandedExitDetails.value.delete(rowIndex)
  } else {
    expandedExitDetails.value.add(rowIndex)
  }
  expandedExitDetails.value = new Set(expandedExitDetails.value)
}

// Toast notification state
const toastMessage = ref('')
const showToast = ref(false)

// Show toast notification
function showToastNotification(message: string) {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

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

// Copy stock purchases to clipboard in Excel-ready format
async function copyStockPurchasesToClipboard(stockPurchases: OrderCalculation[], groupIndex: number) {
  try {
    // Create header row
    const header = 'Date\tQuantity\tAvg Price\tTotal Cost'
    
    // Sort by date descending
    const sortedPurchases = sortOrdersByDate(stockPurchases)
    
    // Create data rows
    const rows = sortedPurchases.map(order => {
      const date = formatOrderDate(order.orderDate)
      const quantity = order.quantity.toLocaleString()
      const avgPrice = Number(order.avgPrice).toFixed(2)
      const totalCost = Number(order.totalCost).toFixed(2)
      
      return `${date}\t${quantity}\t${avgPrice}\t${totalCost}`
    }).join('\n')
    
    // Create total row
    const totalQuantity = stockPurchases.reduce((sum, o) => sum + o.quantity, 0).toLocaleString()
    const totalCost = stockPurchases.reduce((sum, o) => sum + Number(o.totalCost), 0).toFixed(2)
    const totalRow = `Total\t${totalQuantity}\t\t${totalCost}`
    
    // Combine all parts
    const textToCopy = `${header}\n${rows}\n${totalRow}`
    
    // Copy to clipboard
    await navigator.clipboard.writeText(textToCopy)
    
    // Show success feedback
    console.log('✅ Stock purchases copied to clipboard')
    showToastNotification('✅ Stock purchases copied!')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    showToastNotification('❌ Failed to copy')
  }
}

// Copy stock sales to clipboard in Excel-ready format
async function copyStockSalesToClipboard(stockSales: OrderCalculation[], groupIndex: number) {
  try {
    // Create header row
    const header = 'Date\tQuantity\tAvg Price\tTotal Proceeds'
    
    // Sort by date descending
    const sortedSales = sortOrdersByDate(stockSales)
    
    // Create data rows
    const rows = sortedSales.map(order => {
      const date = formatOrderDate(order.orderDate)
      const quantity = order.quantity.toLocaleString()
      const avgPrice = Number(order.avgPrice).toFixed(2)
      const totalProceeds = Number(order.totalCost).toFixed(2)
      
      return `${date}\t${quantity}\t${avgPrice}\t${totalProceeds}`
    }).join('\n')
    
    // Create total row
    const totalQuantity = stockSales.reduce((sum, o) => sum + o.quantity, 0).toLocaleString()
    const totalProceeds = stockSales.reduce((sum, o) => sum + Number(o.totalCost), 0).toFixed(2)
    const totalRow = `Total\t${totalQuantity}\t\t${totalProceeds}`
    
    // Combine all parts
    const textToCopy = `${header}\n${rows}\n${totalRow}`
    
    // Copy to clipboard
    await navigator.clipboard.writeText(textToCopy)
    
    // Show success feedback
    console.log('✅ Stock sales copied to clipboard')
    showToastNotification('✅ Stock sales copied!')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    showToastNotification('❌ Failed to copy')
  }
}

// Copy put sales to clipboard in Excel-ready format
async function copyPutSalesToClipboard(putSales: OrderCalculation[], groupIndex: number, totalPremium: number) {
  try {
    const header = 'Option\tDate\tQuantity\tAvg Price\tTotal Premium'
    const sortedSales = sortOrdersByDate(putSales)
    
    const rows = sortedSales.map(order => {
      const option = parseOrderSymbol(order.symbol)
      const date = formatOrderDate(order.orderDate)
      const quantity = order.quantity.toLocaleString()
      const avgPrice = Number(order.avgPrice).toFixed(2)
      const totalCost = Number(order.totalCost).toFixed(2)
      return `${option}\t${date}\t${quantity}\t${avgPrice}\t${totalCost}`
    }).join('\n')
    
    const totalQuantity = putSales.reduce((sum, o) => sum + o.quantity, 0).toLocaleString()
    const totalRow = `Total\t\t${totalQuantity}\t\t${Math.abs(totalPremium).toFixed(2)}`
    
    const textToCopy = `${header}\n${rows}\n${totalRow}`
    await navigator.clipboard.writeText(textToCopy)
    console.log('✅ Put sales copied to clipboard')
    showToastNotification('✅ Put premium copied!')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    showToastNotification('❌ Failed to copy')
  }
}

// Copy put buybacks to clipboard in Excel-ready format
async function copyPutBuybacksToClipboard(putBuybacks: OrderCalculation[], groupIndex: number, totalCost: number) {
  try {
    const header = 'Option\tDate\tQuantity\tAvg Price\tTotal Cost'
    const sortedBuybacks = sortOrdersByDate(putBuybacks)
    
    const rows = sortedBuybacks.map(order => {
      const option = parseOrderSymbol(order.symbol)
      const date = formatOrderDate(order.orderDate)
      const quantity = order.quantity.toLocaleString()
      const avgPrice = Number(order.avgPrice).toFixed(2)
      const totalCost = Number(order.totalCost).toFixed(2)
      return `${option}\t${date}\t${quantity}\t${avgPrice}\t${totalCost}`
    }).join('\n')
    
    const totalQuantity = putBuybacks.reduce((sum, o) => sum + o.quantity, 0).toLocaleString()
    const totalRow = `Total\t\t${totalQuantity}\t\t${Math.abs(totalCost).toFixed(2)}`
    
    const textToCopy = `${header}\n${rows}\n${totalRow}`
    await navigator.clipboard.writeText(textToCopy)
    console.log('✅ Put buybacks copied to clipboard')
    showToastNotification('✅ Put buybacks copied!')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    showToastNotification('❌ Failed to copy')
  }
}

// Copy call sales to clipboard in Excel-ready format
async function copyCallSalesToClipboard(callSales: OrderCalculation[], groupIndex: number, totalPremium: number) {
  try {
    const header = 'Option\tDate\tQuantity\tAvg Price\tTotal Premium'
    const sortedSales = sortOrdersByDate(callSales)
    
    const rows = sortedSales.map(order => {
      const option = parseOrderSymbol(order.symbol)
      const date = formatOrderDate(order.orderDate)
      const quantity = order.quantity.toLocaleString()
      const avgPrice = Number(order.avgPrice).toFixed(2)
      const totalCost = Number(order.totalCost).toFixed(2)
      return `${option}\t${date}\t${quantity}\t${avgPrice}\t${totalCost}`
    }).join('\n')
    
    const totalQuantity = callSales.reduce((sum, o) => sum + o.quantity, 0).toLocaleString()
    const totalRow = `Total\t\t${totalQuantity}\t\t${Math.abs(totalPremium).toFixed(2)}`
    
    const textToCopy = `${header}\n${rows}\n${totalRow}`
    await navigator.clipboard.writeText(textToCopy)
    console.log('✅ Call sales copied to clipboard')
    showToastNotification('✅ Call premium copied!')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    showToastNotification('❌ Failed to copy')
  }
}

// Copy call buybacks to clipboard in Excel-ready format
async function copyCallBuybacksToClipboard(callBuybacks: OrderCalculation[], groupIndex: number, totalCost: number) {
  try {
    const header = 'Option\tDate\tQuantity\tAvg Price\tTotal Cost'
    const sortedBuybacks = sortOrdersByDate(callBuybacks)
    
    const rows = sortedBuybacks.map(order => {
      const option = parseOrderSymbol(order.symbol)
      const date = formatOrderDate(order.orderDate)
      const quantity = order.quantity.toLocaleString()
      const avgPrice = Number(order.avgPrice).toFixed(2)
      const totalCost = Number(order.totalCost).toFixed(2)
      return `${option}\t${date}\t${quantity}\t${avgPrice}\t${totalCost}`
    }).join('\n')
    
    const totalQuantity = callBuybacks.reduce((sum, o) => sum + o.quantity, 0).toLocaleString()
    const totalRow = `Total\t\t${totalQuantity}\t\t${Math.abs(totalCost).toFixed(2)}`
    
    const textToCopy = `${header}\n${rows}\n${totalRow}`
    await navigator.clipboard.writeText(textToCopy)
    console.log('✅ Call buybacks copied to clipboard')
    showToastNotification('✅ Call buybacks copied!')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    showToastNotification('❌ Failed to copy')
  }
}

// Format date from DD/MM/YYYY to "Mon DD, YYYY"
function formatOrderDate(dateString: string): string {
  if (!dateString) return 'N/A'
  
  try {
    // Parse DD/MM/YYYY format
    const parts = dateString.split('/')
    if (parts.length === 3) {
      const day = parts[0]
      const month = parts[1]
      const year = parts[2]
      
      // Create date object (month is 0-indexed in JS)
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      
      // Format as "Mon DD, YYYY"
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
      return date.toLocaleDateString('en-US', options)
    }
  } catch (error) {
    console.error('Error formatting date:', error)
  }
  
  return dateString
}

// Sort orders by date in descending order (newest first)
function sortOrdersByDate(orders: OrderCalculation[]): OrderCalculation[] {
  return [...orders].sort((a, b) => {
    if (!a.orderDate) return 1
    if (!b.orderDate) return -1
    
    // Parse DD/MM/YYYY format
    const parseDate = (dateStr: string) => {
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
      }
      return new Date(0)
    }
    
    const dateA = parseDate(a.orderDate)
    const dateB = parseDate(b.orderDate)
    
    return dateB.getTime() - dateA.getTime() // Descending order
  })
}

function parseOrderSymbol(symbolText: string): string {
  if (!symbolText) return ''
  const text = String(symbolText).trim()
  
  // Check if it's an option symbol (format: MSFT 251031P00530000)
  const optionMatch = text.match(/^([A-Z]+)\s+(\d{6})([CP])(\d{8})$/)
  
  if (optionMatch) {
    const ticker = optionMatch[1]
    const yymmdd = optionMatch[2]
    const right = optionMatch[3]
    const strikeRaw = optionMatch[4]
    
    // Parse expiry date
    const yy = yymmdd.substring(0, 2)
    const mm = yymmdd.substring(2, 4)
    const dd = yymmdd.substring(4, 6)
    const expiry = `20${yy}-${mm}-${dd}`
    
    // Parse strike price (divide by 1000)
    const strike = (parseInt(strikeRaw, 10) / 1000).toString()
    
    // Return formatted string: MSFT 2025-10-31 530 P
    //return `${ticker} ${expiry} ${strike} ${right}`
    return `${expiry} ${strike} ${right}`
  }
  
  // If not an option symbol, return as is
  return text
}
</script>

<template>
  <!-- Toast Notification -->
  <transition name="toast-fade">
    <div v-if="showToast" class="toast-notification">
      {{ toastMessage }}
    </div>
  </transition>

  <transition name="slide-fade">
    <div v-show="showCalculationDetails" class="calculation-details">
      <h2>Average Price calculation details :</h2>
      <!-- Add this after line 376, inside the "Hold Orders Tab Content" section, before the closing </div> -->

      <!-- Quick Summary Table -->
      <div v-if="orderGroups && orderGroups.length > 0" class="summary-table-section">
        <div class="summary-header-fancy">
          <div class="header-icon">📊</div>
          <div class="header-text">
            <h3>Quick Summary</h3>
            <span class="header-subtitle">All Accounts at a Glance</span>
          </div>
          <div class="header-badge">{{ orderGroups.length }} Accounts</div>
        </div>
        <div class="summary-table-wrapper-fancy">
          <table class="summary-table-fancy">
            <thead>
              <tr>
                <th class="expand-col"></th>
                <th>Account</th>
                <th class="text-center">Shares</th>
                <th class="text-center">Net Cost<br/><small>(Shares * Avg. Price Hold till Expiry)</small></th>
                <th class="text-center">Avg Price<br/><small>(From IBKR)</small></th>
                <th class="text-center"><span>Avg Price<br/><small>(Hold till Expiry)</small></span></th>
                <th class="text-center"><span>Avg Price<br/><small>(Exit Today)</small></span></th>
                <th class="text-center">Difference of Avg Price<br/><small>(Exit Today - Hold till Expiry)</small></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(group, index) in orderGroups" :key="`summary-${index}`">
                <tr 
                  class="summary-row clickable-row"
                  :class="{ 'expanded': expandedSummaryRows.has(index) }"
                  @click="toggleSummaryRowExpansion(index)"
                >
                  <td class="expand-cell">
                    <span class="expand-arrow" :class="{ 'rotated': expandedSummaryRows.has(index) }">▶</span>
                  </td>
                  <td class="text-center account-cell">
                    <span class="account-badge">{{ group.mainPosition.account }}</span>
                  </td>
                  <td class="text-center shares-cell">
                    <span class="value-highlight">{{ group.totalShares.toLocaleString() }}</span>
                  </td>
                  <td class="text-center cost-cell">
                    <span class="currency-value">${{ group.netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                  </td>
                  <td class="text-center price-cell ibkr-price">
                    <span v-if="group.mainPosition.avgPrice" class="price-badge ibkr">${{ group.mainPosition.avgPrice.toFixed(2) }}</span>
                    <span v-else class="no-data">-</span>
                  </td>
                  <td class="text-center price-cell hold-price">
                    <span class="price-badge hold">${{ group.adjustedAvgPricePerShare.toFixed(2) }}</span>
                  </td>
                  <td class="text-center price-cell exit-price">
                    <span v-if="orderGroupsExitToday && orderGroupsExitToday[index]" class="price-badge exit">
                      ${{ orderGroupsExitToday[index].adjustedAvgPricePerShare.toFixed(2) }}
                    </span>
                    <span v-else class="no-data">-</span>
                  </td>
                  <td class="text-center diff-cell">
                    <span 
                      v-if="orderGroupsExitToday && orderGroupsExitToday[index]"
                      class="diff-badge"
                      :class="{
                        'positive': orderGroupsExitToday[index].adjustedAvgPricePerShare < group.adjustedAvgPricePerShare,
                        'negative': orderGroupsExitToday[index].adjustedAvgPricePerShare > group.adjustedAvgPricePerShare
                      }"
                    >
                      <span class="diff-icon">{{ orderGroupsExitToday[index].adjustedAvgPricePerShare < group.adjustedAvgPricePerShare ? '↓' : '↑' }}</span>
                      ${{ Math.abs(orderGroupsExitToday[index].adjustedAvgPricePerShare - group.adjustedAvgPricePerShare).toFixed(2) }}
                    </span>
                    <span v-else class="no-data">-</span>
                  </td>
                </tr>
                <!-- Expandable Detail Row -->
                <tr v-if="expandedSummaryRows.has(index)" class="detail-row">
                  <td colspan="8">
                    <div class="detail-content">
                      <!-- Side by Side Comparison -->
                      <div class="side-by-side-comparison">
                        <!-- LEFT: Hold till Expiry -->
                        <div class="comparison-panel hold-panel">
                          <div class="panel-header hold">
                            <span class="panel-icon">🔒</span>
                            <span class="panel-title">Hold till Expiry</span>
                          </div>
                          <div class="panel-content">
                            <!-- Stock Section -->
                            <div class="mini-section stock-mini">
                              <div class="mini-header">📊 Stocks</div>
                              <div class="mini-row">
                                <span>Total Stock Purchases:</span>
                                <span class="value">${{ group.stockPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div v-if="group.stockSaleProceeds && group.stockSaleProceeds > 0" class="mini-row">
                                <span>Less: Stock Sales:</span>
                                <span class="value">-${{ Math.abs(group.stockSaleProceeds).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result">
                                <span>Net Stock Cost:</span>
                                <span class="value">${{ group.netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                            </div>
                            
                            <!-- Put Section -->
                            <div class="mini-section put-mini">
                              <div class="mini-header">📉 Puts</div>
                              <div v-if="group.putPremiumReceived > 0" class="mini-row">
                                <span>Put Premium Received:</span>
                                <span class="value">${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div v-if="group.putBuybackCost && group.putBuybackCost > 0" class="mini-row">
                                <span>Less: Buyback Cost:</span>
                                <span class="value">-${{ Math.abs(group.putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result">
                                <span>Net Put Cash Flow:</span>
                                <span class="value">${{ (group.netPutCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                            </div>
                            
                            <!-- Call Section -->
                            <div class="mini-section call-mini">
                              <div class="mini-header">� Calls</div>
                              <div v-if="group.callPremiumReceived > 0" class="mini-row">
                                <span>Call Premium Received:</span>
                                <span class="value">${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div v-if="group.callBuybackCost && group.callBuybackCost > 0" class="mini-row">
                                <span>Less: Buyback Cost:</span>
                                <span class="value">-${{ Math.abs(group.callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result">
                                <span>Net Call Cash Flow:</span>
                                <span class="value">${{ (group.netCallCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                            </div>
                            
                            <!-- Final Calculation -->
                            <div class="mini-section final-calc">
                              <div class="mini-header">🎯 Final Calculation</div>
                              <div class="mini-row formula">
                                <span>Total Net Cost = Stock - Puts - Calls</span>
                              </div>
                              <div class="mini-row formula">
                                <span>= ${{ group.netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(group.netPutCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(group.netCallCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result highlight">
                                <span>Total Net Cost:</span>
                                <span class="value">${{ group.netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result highlight final">
                                <span>Avg Price ({{ group.totalShares.toLocaleString() }} shares):</span>
                                <span class="value big">${{ group.adjustedAvgPricePerShare.toFixed(2) }}</span>
                              </div>
                            </div>

                            <!-- Toggle for Detailed Calculation -->
                            <div class="detailed-toggle-section">
                              <button class="toggle-details-btn" @click.stop="toggleHoldDetails(index)">
                                <span class="toggle-arrow" :class="{ 'rotated': expandedHoldDetails.has(index) }">▶</span>
                                {{ expandedHoldDetails.has(index) ? 'Hide' : 'Show' }} Detailed Breakdown
                              </button>
                            </div>
                            
                            <!-- Detailed Calculation Sections -->
                            <transition name="slide-fade">
                              <div v-if="expandedHoldDetails.has(index)" class="detailed-sections">
                                <!-- Section A: Stocks -->
                                <div class="detail-section section-stock">
                                  <div class="section-label">Section A: Stocks</div>
                                  <div class="section-tables">
                                    <!-- Stock Purchases Table -->
                                    <div class="table-half">
                                      <div class="table-title">📍 Stock Purchases ({{ group.stockPurchases?.length || 0 }})</div>
                                      <div v-if="group.stockPurchases && group.stockPurchases.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Date</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(group.stockPurchases)" :key="`hold-sp-${index}-${oi}`">
                                              <td>{{ formatOrderDate(order.orderDate) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ group.stockPurchases.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ group.stockPurchases.reduce((sum: number, o: OrderCalculation) => sum + Number(o.totalCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No stock purchases</div>
                                    </div>
                                    <!-- Stock Sales Table -->
                                    <div class="table-half">
                                      <div class="table-title">💰 Stock Sales ({{ group.stockSales?.length || 0 }})</div>
                                      <div v-if="group.stockSales && group.stockSales.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Date</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Proceeds</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(group.stockSales)" :key="`hold-ss-${index}-${oi}`">
                                              <td>{{ formatOrderDate(order.orderDate) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ group.stockSales.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ group.stockSales.reduce((sum: number, o: OrderCalculation) => sum + Number(o.totalCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No stock sales</div>
                                    </div>
                                  </div>
                                  <div class="section-summary stock-summary-box">
                                    <div><strong>Net Stock:</strong> ${{ group.stockPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} <span v-if="group.stockSaleProceeds > 0">- ${{ Math.abs(group.stockSaleProceeds).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span> = <span class="result-value">${{ group.netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span></div>
                                    <div><strong>Current Shares:</strong> {{ group.totalShares.toLocaleString() }}</div>
                                  </div>
                                </div>

                                <!-- Section B: Puts -->
                                <div class="detail-section section-put">
                                  <div class="section-label">Section B: Puts</div>
                                  <div class="section-tables">
                                    <!-- Put Sales Table -->
                                    <div class="table-half">
                                      <div class="table-title">📉 Put Premium Received ({{ group.putSales?.length || 0 }})</div>
                                      <div v-if="group.putSales && group.putSales.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Option</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Premium</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(group.putSales)" :key="`hold-ps-${index}-${oi}`">
                                              <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ group.putSales.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No put sales</div>
                                    </div>
                                    <!-- Put Buybacks Table -->
                                    <div class="table-half">
                                      <div class="table-title">🔄 Put Buybacks ({{ group.putBuybacks?.length || 0 }})</div>
                                      <div v-if="group.putBuybacks && group.putBuybacks.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Option</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Cost</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(group.putBuybacks)" :key="`hold-pb-${index}-${oi}`">
                                              <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ group.putBuybacks.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ Math.abs(group.putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No put buybacks</div>
                                    </div>
                                  </div>
                                  <div class="section-summary put-summary-box">
                                    <strong>Net Put Cash Flow:</strong> ${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} <span v-if="group.putBuybackCost > 0">- ${{ Math.abs(group.putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span> = <span class="result-value">${{ (group.netPutCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                                  </div>
                                </div>

                                <!-- Section C: Calls -->
                                <div class="detail-section section-call">
                                  <div class="section-label">Section C: Calls</div>
                                  <div class="section-tables">
                                    <!-- Call Sales Table -->
                                    <div class="table-half">
                                      <div class="table-title">📞 Call Premium Received ({{ group.callSales?.length || 0 }})</div>
                                      <div v-if="group.callSales && group.callSales.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Option</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Premium</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(group.callSales)" :key="`hold-cs-${index}-${oi}`">
                                              <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ group.callSales.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No call sales</div>
                                    </div>
                                    <!-- Call Buybacks Table -->
                                    <div class="table-half">
                                      <div class="table-title">🔄 Call Buybacks ({{ group.callBuybacks?.length || 0 }})</div>
                                      <div v-if="group.callBuybacks && group.callBuybacks.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Option</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Cost</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(group.callBuybacks)" :key="`hold-cb-${index}-${oi}`">
                                              <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ group.callBuybacks.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ Math.abs(group.callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No call buybacks</div>
                                    </div>
                                  </div>
                                  <div class="section-summary call-summary-box">
                                    <strong>Net Call Cash Flow:</strong> ${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} <span v-if="group.callBuybackCost > 0">- ${{ Math.abs(group.callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span> = <span class="result-value">${{ (group.netCallCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                                  </div>
                                </div>
                              </div>
                            </transition>

                          </div>
                        </div>
                        
                        <!-- Divider -->
                        <div class="comparison-divider">
                          <div class="divider-line"></div>
                          <div class="divider-text">VS</div>
                          <div class="divider-line"></div>
                        </div>
                        
                        <!-- RIGHT: Exit Today -->
                        <div class="comparison-panel exit-panel" v-if="orderGroupsExitToday && orderGroupsExitToday[index]">
                          <div class="panel-header exit">
                            <span class="panel-icon">🚪</span>
                            <span class="panel-title">Exit Today</span>
                          </div>
                          <div class="panel-content">
                            <!-- Stock Section -->
                            <div class="mini-section stock-mini">
                              <div class="mini-header">📊 Stocks</div>
                              <div class="mini-row">
                                <span>Total Stock Purchases:</span>
                                <span class="value">${{ orderGroupsExitToday[index].stockPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div v-if="orderGroupsExitToday[index].stockSaleProceeds && orderGroupsExitToday[index].stockSaleProceeds > 0" class="mini-row">
                                <span>Less: Stock Sales:</span>
                                <span class="value">-${{ Math.abs(orderGroupsExitToday[index].stockSaleProceeds).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result">
                                <span>Net Stock Cost:</span>
                                <span class="value">${{ orderGroupsExitToday[index].netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                            </div>
                            
                            <!-- Put Section -->
                            <div class="mini-section put-mini">
                              <div class="mini-header">📉 Puts</div>
                              <div v-if="orderGroupsExitToday[index].putPremiumReceived > 0" class="mini-row">
                                <span>Put Premium Received:</span>
                                <span class="value">${{ Math.abs(orderGroupsExitToday[index].putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div v-if="orderGroupsExitToday[index].putBuybackCost && orderGroupsExitToday[index].putBuybackCost > 0" class="mini-row">
                                <span>Less: Buyback Cost:</span>
                                <span class="value">-${{ Math.abs(orderGroupsExitToday[index].putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result">
                                <span>Net Put Cash Flow:</span>
                                <span class="value">${{ (orderGroupsExitToday[index].netPutCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                            </div>
                            
                            <!-- Call Section (Current Value) -->
                            <div class="mini-section call-mini">
                              <div class="mini-header">📞 Calls <span class="exit-label">(Current Value)</span></div>
                              <div v-if="orderGroupsExitToday[index].callPremiumReceived > 0" class="mini-row">
                                <span>Call Current Value:</span>
                                <span class="value">${{ Math.abs(orderGroupsExitToday[index].callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div v-if="orderGroupsExitToday[index].callBuybackCost && orderGroupsExitToday[index].callBuybackCost > 0" class="mini-row">
                                <span>Less: Buyback Cost:</span>
                                <span class="value">-${{ Math.abs(orderGroupsExitToday[index].callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result">
                                <span>Net Call Cash Flow:</span>
                                <span class="value">${{ (orderGroupsExitToday[index].netCallCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                            </div>
                            
                            <!-- Final Calculation -->
                            <div class="mini-section final-calc">
                              <div class="mini-header">🎯 Final Calculation</div>
                              <div class="mini-row formula">
                                <span>Total Net Cost = Stock - Puts - Calls</span>
                              </div>
                              <div class="mini-row formula">
                                <span>= ${{ orderGroupsExitToday[index].netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(orderGroupsExitToday[index].netPutCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(orderGroupsExitToday[index].netCallCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result highlight">
                                <span>Total Net Cost:</span>
                                <span class="value">${{ orderGroupsExitToday[index].netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                              </div>
                              <div class="mini-row result highlight final">
                                <span>Avg Price ({{ orderGroupsExitToday[index].totalShares.toLocaleString() }} shares):</span>
                                <span class="value big">${{ orderGroupsExitToday[index].adjustedAvgPricePerShare.toFixed(2) }}</span>
                              </div>
                            </div>

                            <!-- Toggle for Detailed Calculation -->
                            <div class="detailed-toggle-section">
                              <button class="toggle-details-btn exit-btn" @click.stop="toggleExitDetails(index)">
                                <span class="toggle-arrow" :class="{ 'rotated': expandedExitDetails.has(index) }">▶</span>
                                {{ expandedExitDetails.has(index) ? 'Hide' : 'Show' }} Detailed Breakdown
                              </button>
                            </div>
                            
                            <!-- Detailed Calculation Sections -->
                            <transition name="slide-fade">
                              <div v-if="expandedExitDetails.has(index)" class="detailed-sections">
                                <!-- Section A: Stocks -->
                                <div class="detail-section section-stock">
                                  <div class="section-label">Section A: Stocks</div>
                                  <div class="section-tables">
                                    <!-- Stock Purchases Table -->
                                    <div class="table-half">
                                      <div class="table-title">📍 Stock Purchases ({{ orderGroupsExitToday[index].stockPurchases?.length || 0 }})</div>
                                      <div v-if="orderGroupsExitToday[index].stockPurchases && orderGroupsExitToday[index].stockPurchases.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Date</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(orderGroupsExitToday[index].stockPurchases)" :key="`exit-sp-${index}-${oi}`">
                                              <td>{{ formatOrderDate(order.orderDate) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ orderGroupsExitToday[index].stockPurchases.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ orderGroupsExitToday[index].stockPurchases.reduce((sum: number, o: OrderCalculation) => sum + Number(o.totalCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No stock purchases</div>
                                    </div>
                                    <!-- Stock Sales Table -->
                                    <div class="table-half">
                                      <div class="table-title">💰 Stock Sales ({{ orderGroupsExitToday[index].stockSales?.length || 0 }})</div>
                                      <div v-if="orderGroupsExitToday[index].stockSales && orderGroupsExitToday[index].stockSales.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Date</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Proceeds</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(orderGroupsExitToday[index].stockSales)" :key="`exit-ss-${index}-${oi}`">
                                              <td>{{ formatOrderDate(order.orderDate) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ orderGroupsExitToday[index].stockSales.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ orderGroupsExitToday[index].stockSales.reduce((sum: number, o: OrderCalculation) => sum + Number(o.totalCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No stock sales</div>
                                    </div>
                                  </div>
                                  <div class="section-summary stock-summary-box">
                                    <div><strong>Net Stock:</strong> ${{ orderGroupsExitToday[index].stockPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} <span v-if="orderGroupsExitToday[index].stockSaleProceeds > 0">- ${{ Math.abs(orderGroupsExitToday[index].stockSaleProceeds).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span> = <span class="result-value">${{ orderGroupsExitToday[index].netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span></div>
                                    <div><strong>Current Shares:</strong> {{ orderGroupsExitToday[index].totalShares.toLocaleString() }}</div>
                                  </div>
                                </div>

                                <!-- Section B: Puts -->
                                <div class="detail-section section-put">
                                  <div class="section-label">Section B: Puts</div>
                                  <div class="section-tables">
                                    <!-- Put Sales Table -->
                                    <div class="table-half">
                                      <div class="table-title">📉 Put Premium Received ({{ orderGroupsExitToday[index].putSales?.length || 0 }})</div>
                                      <div v-if="orderGroupsExitToday[index].putSales && orderGroupsExitToday[index].putSales.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Option</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Premium</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(orderGroupsExitToday[index].putSales)" :key="`exit-ps-${index}-${oi}`">
                                              <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ orderGroupsExitToday[index].putSales.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ Math.abs(orderGroupsExitToday[index].putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No put sales</div>
                                    </div>
                                    <!-- Put Buybacks Table -->
                                    <div class="table-half">
                                      <div class="table-title">🔄 Put Buybacks ({{ orderGroupsExitToday[index].putBuybacks?.length || 0 }})</div>
                                      <div v-if="orderGroupsExitToday[index].putBuybacks && orderGroupsExitToday[index].putBuybacks.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Option</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Cost</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(orderGroupsExitToday[index].putBuybacks)" :key="`exit-pb-${index}-${oi}`">
                                              <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ orderGroupsExitToday[index].putBuybacks.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ Math.abs(orderGroupsExitToday[index].putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No put buybacks</div>
                                    </div>
                                  </div>
                                  <div class="section-summary put-summary-box">
                                    <strong>Net Put Cash Flow:</strong> ${{ Math.abs(orderGroupsExitToday[index].putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} <span v-if="orderGroupsExitToday[index].putBuybackCost > 0">- ${{ Math.abs(orderGroupsExitToday[index].putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span> = <span class="result-value">${{ (orderGroupsExitToday[index].netPutCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                                  </div>
                                </div>

                                <!-- Section C: Calls (Current Value) -->
                                <div class="detail-section section-call">
                                  <div class="section-label">Section C: Calls <span class="exit-note">(Current Value)</span></div>
                                  <div class="section-tables">
                                    <!-- Call Current Value Table -->
                                    <div class="table-half">
                                      <div class="table-title">📞 Call Current Value ({{ orderGroupsExitToday[index].callSales?.length || 0 }})</div>
                                      <div v-if="orderGroupsExitToday[index].callSales && orderGroupsExitToday[index].callSales.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Option</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Value</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(orderGroupsExitToday[index].callSales)" :key="`exit-cs-${index}-${oi}`">
                                              <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ orderGroupsExitToday[index].callSales.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ Math.abs(orderGroupsExitToday[index].callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No call positions</div>
                                    </div>
                                    <!-- Call Buybacks Table -->
                                    <div class="table-half">
                                      <div class="table-title">🔄 Call Buybacks ({{ orderGroupsExitToday[index].callBuybacks?.length || 0 }})</div>
                                      <div v-if="orderGroupsExitToday[index].callBuybacks && orderGroupsExitToday[index].callBuybacks.length > 0" class="mini-table-wrapper">
                                        <table class="mini-data-table">
                                          <thead>
                                            <tr>
                                              <th>Option</th>
                                              <th>Qty</th>
                                              <th>Price</th>
                                              <th>Cost</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr v-for="(order, oi) in sortOrdersByDate(orderGroupsExitToday[index].callBuybacks)" :key="`exit-cb-${index}-${oi}`">
                                              <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                              <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                              <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                              <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                                            </tr>
                                          </tbody>
                                          <tfoot>
                                            <tr class="total-row">
                                              <td><strong>Total</strong></td>
                                              <td class="text-right"><strong>{{ orderGroupsExitToday[index].callBuybacks.reduce((sum: number, o: OrderCalculation) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                              <td></td>
                                              <td class="text-right"><strong>${{ Math.abs(orderGroupsExitToday[index].callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                      <div v-else class="no-data-mini">No call buybacks</div>
                                    </div>
                                  </div>
                                  <div class="section-summary call-summary-box">
                                    <strong>Net Call Cash Flow:</strong> ${{ Math.abs(orderGroupsExitToday[index].callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} <span v-if="orderGroupsExitToday[index].callBuybackCost > 0">- ${{ Math.abs(orderGroupsExitToday[index].callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span> = <span class="result-value">${{ (orderGroupsExitToday[index].netCallCashFlow || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                                  </div>
                                </div>
                              </div>
                            </transition>
                            
                          </div>
                        </div>
                        <div v-else class="comparison-panel exit-panel no-data-panel">
                          <div class="panel-header exit">
                            <span class="panel-icon">🚪</span>
                            <span class="panel-title">Exit Today</span>
                          </div>
                          <div class="panel-content">
                            <div class="no-data-message">
                              <span>No exit today data available</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Difference Summary -->
                      <div v-if="orderGroupsExitToday && orderGroupsExitToday[index]" class="difference-summary">
                        <div class="diff-summary-header">📈 Difference Analysis</div>
                        <div class="diff-summary-content">
                          <div class="diff-item">
                            <span class="diff-label">Net Cost Difference:</span>
                            <span 
                              class="diff-value"
                              :class="{
                                'positive': orderGroupsExitToday[index].netCost < group.netCost,
                                'negative': orderGroupsExitToday[index].netCost > group.netCost
                              }"
                            >
                              {{ orderGroupsExitToday[index].netCost < group.netCost ? '↓' : '↑' }}
                              ${{ Math.abs(orderGroupsExitToday[index].netCost - group.netCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                            </span>
                          </div>
                          <div class="diff-item">
                            <span class="diff-label">Avg Price Difference:</span>
                            <span 
                              class="diff-value"
                              :class="{
                                'positive': orderGroupsExitToday[index].adjustedAvgPricePerShare < group.adjustedAvgPricePerShare,
                                'negative': orderGroupsExitToday[index].adjustedAvgPricePerShare > group.adjustedAvgPricePerShare
                              }"
                            >
                              {{ orderGroupsExitToday[index].adjustedAvgPricePerShare < group.adjustedAvgPricePerShare ? '↓' : '↑' }}
                              ${{ Math.abs(orderGroupsExitToday[index].adjustedAvgPricePerShare - group.adjustedAvgPricePerShare).toFixed(2) }} per share
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr class="total-row-fancy">
                <td class="expand-cell"></td>
                <td><span class="total-label">📈 Total / Overall</span></td>
                <td class="text-center"><span class="total-value">{{ totalShares.toLocaleString() }}</span></td>
                <td class="text-center"><span class="total-value currency">${{ totalNetCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span></td>
                <td class="text-center"><span class="total-value">-</span></td>
                <td class="text-center"><span class="total-value highlight-hold">${{ overallAdjustedAvgPriceFromOrders?.toFixed(2) || '-' }}</span></td>
                <td class="text-center"><span class="total-value highlight-exit">${{ overallAdjustedAvgPriceFromOrdersExitToday?.toFixed(2) || '-' }}</span></td>
                <td class="text-center">
                  <span
                    v-if="overallAdjustedAvgPriceFromOrders && overallAdjustedAvgPriceFromOrdersExitToday"
                    class="total-diff"
                    :class="{
                      'positive': overallAdjustedAvgPriceFromOrdersExitToday < overallAdjustedAvgPriceFromOrders,
                      'negative': overallAdjustedAvgPriceFromOrdersExitToday > overallAdjustedAvgPriceFromOrders
                    }"
                  >
                    {{ overallAdjustedAvgPriceFromOrdersExitToday < overallAdjustedAvgPriceFromOrders ? '↓' : '↑' }}
                    ${{ Math.abs(overallAdjustedAvgPriceFromOrdersExitToday - overallAdjustedAvgPriceFromOrders).toFixed(2) }}
                  </span>
                  <span v-else class="no-data">-</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  </transition>
</template>

<style scoped>
@import '../styles/scoped-styles.css';
</style>

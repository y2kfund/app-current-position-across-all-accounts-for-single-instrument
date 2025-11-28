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
                <th class="text-center"><span>Avg Price<br/><small>(Hold till Expiry)</small></span></th>
                <th class="text-center"><span>Avg Price<br/><small>(Exit Today)</small></span></th>
                <th class="text-center">Difference</th>
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
                  <td colspan="7">
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
      <!-- Tabs for Calculation Methods -->
      <div class="calculation-tabs">
        <button
          class="tab-button"
          :class="{ active: avgPriceCalculationTab === 'hold-orders' }"
          @click="emit('update:avgPriceCalculationTab', 'hold-orders')"
        >
          Hold orders till expiry
        </button>
        <button
          class="tab-button"
          :class="{ active: avgPriceCalculationTab === 'exit-orders' }"
          @click="emit('update:avgPriceCalculationTab', 'exit-orders')"
        >
          Exit orders today
        </button>
      </div>

      <!-- Hold Orders Tab Content -->
      <div v-if="avgPriceCalculationTab === 'hold-orders'">
        <!-- Loading State -->
        <div v-if="isAvgPriceFromOrdersLoading" class="loading-message">
          <span class="loading-spinner">⏳</span> Loading order data...
        </div>

        <!-- Error State -->
        <div v-else-if="avgPriceFromOrdersError" class="error-message">
          ❌ Error loading orders: {{ avgPriceFromOrdersError }}
        </div>

        <!-- No Data State -->
        <div v-else-if="!orderGroups || orderGroups.length === 0" class="no-data-message">
          <p>No order data found for these positions.</p>
        </div>

        <!-- Detailed Calculation from Orders (mirroring Positions tab) -->
        <div v-else>
          <div v-for="(group, groupIndex) in orderGroups" :key="`order-group-${groupIndex}`" class="position-group">
            <div class="group-header clickable" @click="toggleGroupExpansion(groupIndex)">
              <span class="toggle-icon">{{ expandedGroups.has(groupIndex) ? '▼' : '▶' }}</span>
              Client {{ groupIndex + 1 }}: {{ group.mainPosition.account }}
              <span class="orders-count-badge">
                {{ (group.stockPurchases?.length || 0) + (group.stockSales?.length || 0) + (group.putSales?.length || 0) + (group.putBuybacks?.length || 0) + (group.callSales?.length || 0) + (group.callBuybacks?.length || 0) }} orders
              </span>
            </div>
            <transition name="slide-fade">
              <div v-show="expandedGroups.has(groupIndex)" class="group-content">
                <div class="parent-stock-container">
                  Section: A
                  <!-- Stock Purchases and Sales Side by Side -->
                  <div class="stock-sections-container">
                    <!-- Stock Purchases -->
                    <div class="stock-section-half">
                      <div v-if="group.stockPurchases && group.stockPurchases.length > 0" class="order-section order-stock-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>📍 Stock Purchases ({{ group.stockPurchases.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyStockPurchasesToClipboard(group.stockPurchases, groupIndex)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <!-- Stock Purchases Table -->
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.stockPurchases)" :key="`stock-${groupIndex}-${orderIndex}`">
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.stockPurchases.reduce((sum, o) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ group.stockPurchases.reduce((sum, o) => sum + Number(o.totalCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No stock purchases found</div>
                    </div>

                    <!-- Stock Sales -->
                    <div class="stock-section-half">
                      <div v-if="group.stockSales && group.stockSales.length > 0" class="order-section order-stock-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>💰 Stock Sales ({{ group.stockSales.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyStockSalesToClipboard(group.stockSales, groupIndex)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <!-- Stock Sales Table -->
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Proceeds</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.stockSales)" :key="`stock-sale-${groupIndex}-${orderIndex}`">
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.stockSales.reduce((sum, o) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ group.stockSales.reduce((sum, o) => sum + Number(o.totalCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No stock sales found</div>
                    </div>
                  </div>

                  <!-- Net Stock Summary -->
                  <div v-if="group.netStockCost !== undefined || group.totalShares" class="order-section" style="padding: 1rem;">
                    <div style="font-size: 1.1rem; margin-bottom: 0.75rem;">                    
                      <!-- Net Stock Cost Calculation -->
                      <div style="margin-bottom: 0.5rem;">
                        <div style="font-weight: 600; color: #495057; margin-bottom: 0.25rem;">Net Stock Cost:</div>
                        <div style="margin-left: 1rem; color: #6c757d; font-size: 0.95rem;">
                          <div>Total Stock Purchases: ${{ group.stockPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div v-if="group.stockSaleProceeds && group.stockSaleProceeds > 0">Less: Stock Sales: ${{ Math.abs(group.stockSaleProceeds).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div style="border-top: 1px solid #dee2e6; margin-top: 0.25rem; padding-top: 0.25rem; font-weight: 600; color: #28a745; font-size: 1.05rem;">
                            = ${{ group.netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                          </div>
                        </div>
                      </div>
                      
                      <!-- Current Shares Calculation -->
                      <div>
                        <div style="font-weight: 600; color: #495057; margin-bottom: 0.25rem;">Current Shares:</div>
                        <div style="margin-left: 1rem; color: #6c757d; font-size: 0.95rem;">
                          <div>Total Purchased: {{ group.stockPurchases.reduce((sum, o) => sum + o.quantity, 0).toLocaleString() }} shares</div>
                          <div v-if="group.stockSales && group.stockSales.length > 0">Less: Sold: {{ group.stockSales.reduce((sum, o) => sum + o.quantity, 0).toLocaleString() }} shares</div>
                          <div style="border-top: 1px solid #dee2e6; margin-top: 0.25rem; padding-top: 0.25rem; font-weight: 600; color: #28a745; font-size: 1.05rem;">
                            = {{ group.totalShares.toLocaleString() }} shares
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <div class="parent-put-container">
                  Section: B
                  <!-- Put Sections Side by Side -->
                  <div class="stock-sections-container">
                    <!-- Put Premium Received -->
                    <div class="stock-section-half">
                      <div v-if="group.putSales && group.putSales.length > 0" class="order-section order-put-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>📉 Put Premium Received ({{ group.putSales.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyPutSalesToClipboard(group.putSales, groupIndex, group.putPremiumReceived)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Option</th>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Premium</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.putSales)" :key="`put-${groupIndex}-${orderIndex}`">
                                <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td colspan="2"><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.putSales.reduce((sum, o) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No put premium received</div>
                    </div>

                    <!-- Put Buybacks (Closing Buys) -->
                    <div class="stock-section-half">
                      <div v-if="group.putBuybacks && group.putBuybacks.length > 0" class="order-section order-put-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>🔄 Put Buybacks ({{ group.putBuybacks.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyPutBuybacksToClipboard(group.putBuybacks, groupIndex, group.putBuybackCost)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Option</th>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.putBuybacks)" :key="`put-buyback-${groupIndex}-${orderIndex}`">
                                <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td colspan="2"><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.putBuybacks.reduce((sum, o) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ Math.abs(group.putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No put buybacks found</div>
                    </div>                  
                  </div>

                  <!-- Net Put Summary -->
                  <div v-if="(group.putSales && group.putSales.length > 0) || (group.putBuybacks && group.putBuybacks.length > 0)" class="order-section" style="padding: 1rem;">
                    <div style="font-size: 1.1rem; margin-bottom: 0.75rem;">                    
                      <!-- Net Put Cash Flow Calculation -->
                      <div>
                        <div style="font-weight: 600; color: #495057; margin-bottom: 0.25rem;">📊Net Put Cash Flow:</div>
                        <div style="margin-left: 1rem; color: #6c757d; font-size: 0.95rem;">
                          <div v-if="group.putPremiumReceived > 0">Put Premium Received: ${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div v-if="group.putBuybackCost && group.putBuybackCost > 0">Less: Put Buyback Cost: ${{ Math.abs(group.putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div style="border-top: 1px solid #dee2e6; margin-top: 0.25rem; padding-top: 0.25rem; font-weight: 600; color: #ff9800; font-size: 1.05rem;">
                            = ${{ group.netPutCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="parent-call-container">
                  Section: C
                  <!-- Call Sections Side by Side -->
                  <div class="stock-sections-container">
                    <!-- Call Premiums Received -->
                    <div class="stock-section-half">
                      <div v-if="group.callSales && group.callSales.length > 0" class="order-section order-call-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>📞 Call Premiums Received ({{ group.callSales.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyCallSalesToClipboard(group.callSales, groupIndex, group.callPremiumReceived)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Option</th>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Premium</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.callSales)" :key="`call-${groupIndex}-${orderIndex}`">
                                <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td colspan="2"><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.callSales.reduce((sum, o) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No call premium received</div>
                    </div>

                    <!-- Call Buybacks (Closing Buys) -->
                    <div class="stock-section-half">
                      <div v-if="group.callBuybacks && group.callBuybacks.length > 0" class="order-section order-call-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>🔄 Call Buybacks ({{ group.callBuybacks.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyCallBuybacksToClipboard(group.callBuybacks, groupIndex, group.callBuybackCost)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Option</th>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.callBuybacks)" :key="`call-buyback-${groupIndex}-${orderIndex}`">
                                <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td colspan="2"><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.callBuybacks.reduce((sum, o) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ Math.abs(group.callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No call buybacks found</div>
                    </div>
                  </div>

                  <!-- Net Call Summary -->
                  <div v-if="(group.callSales && group.callSales.length > 0) || (group.callBuybacks && group.callBuybacks.length > 0)" class="order-section" style="padding: 1rem;">
                    <div style="font-size: 1.1rem; margin-bottom: 0.75rem;">                    
                      <!-- Net Call Cash Flow Calculation -->
                      <div>
                        <div style="font-weight: 600; color: #495057; margin-bottom: 0.25rem;">📊 Net Call Cash Flow:</div>
                        <div style="margin-left: 1rem; color: #6c757d; font-size: 0.95rem;">
                          <div v-if="group.callPremiumReceived > 0">Call Premium Received: ${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div v-if="group.callBuybackCost && group.callBuybackCost > 0">Less: Call Buyback Cost: ${{ Math.abs(group.callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div style="border-top: 1px solid #dee2e6; margin-top: 0.25rem; padding-top: 0.25rem; font-weight: 600; color: #2196f3; font-size: 1.05rem;">
                            = ${{ group.netCallCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Calculation summary for this client -->
                <div class="group-calculation">
                  <div class="calc-line">📊 <strong>Calculation:</strong></div>
                  <!-- <div class="calc-line indent">Stock Purchases: -${{ group.totalStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent" v-if="group.stockSaleProceeds && group.stockSaleProceeds > 0">Stock Sales: +${{ Math.abs(group.stockSaleProceeds).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent" v-if="group.netStockCost !== undefined && group.netStockCost !== group.totalStockCost"><strong>Net Stock Cost: ${{ group.netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></div>
                  <div class="calc-line indent" v-if="group.putPremiumReceived > 0">Put Premium Received: +${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent" v-if="group.putBuybackCost && group.putBuybackCost > 0">Put Buyback Cost: -${{ Math.abs(group.putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent" v-if="group.netPutCashFlow !== undefined && group.netPutCashFlow !== group.putPremiumReceived"><strong>Net Put Cash Flow: ${{ group.netPutCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></div>
                  <div class="calc-line indent" v-if="group.callPremiumReceived > 0">Call Premium Received: +${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent" v-if="group.callBuybackCost && group.callBuybackCost > 0">Call Buyback Cost: -${{ Math.abs(group.callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent" v-if="group.netCallCashFlow !== undefined && group.netCallCashFlow !== group.callPremiumReceived"><strong>Net Call Cash Flow: ${{ group.netCallCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></div> -->
                  <div class="calc-line indent" style="border-top: 1px solid #dee2e6; margin-top: 0.5rem; padding-top: 0.5rem;"><strong>Total Net Cost = ${{ group.netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(group.netPutCashFlow || group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(group.netCallCashFlow || group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} = ${{ group.netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></div>
                  <div class="calc-line indent"><strong>Adjusted Avg Price = ${{ group.netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ {{ group.totalShares.toLocaleString() }} = ${{ group.adjustedAvgPricePerShare.toFixed(2) }} per share</strong></div>
                </div>
              </div>
            </transition>
          </div>

          <!-- Overall adjusted average at the top -->
          <div v-if="overallAdjustedAvgPriceFromOrders !== null" class="overall-adjusted-section">
            <div class="overall-adjusted-header">
              🎯 Overall Adjusted Average: ${{ overallAdjustedAvgPriceFromOrders.toFixed(2) }} per share
            </div>
            <div class="overall-calculation-breakdown">
              <div class="breakdown-line">Total Net Cost = {{ orderGroups.map((g) => `$${g.netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' + ') }} = ${{ totalNetCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
              <div class="breakdown-line">Total Main Qty = {{ orderGroups.map((g) => g.totalShares.toLocaleString()).join(' + ') }} = {{ totalShares.toLocaleString() }}</div>
              <div class="breakdown-line"><strong>Overall Adjusted Average = ${{ totalNetCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ {{ totalShares.toLocaleString() }} = ${{ overallAdjustedAvgPriceFromOrders.toFixed(2) }}</strong></div>
            </div>
          </div>
        </div>
      </div>
      <!-- End of Hold Orders Content -->

      <!-- Exit Orders Tab Content -->
      <div v-else-if="avgPriceCalculationTab === 'exit-orders'">
        <!-- Loading State -->
        <div v-if="isAvgPriceFromOrdersLoadingExitToday" class="loading-message">
          <span class="loading-spinner">⏳</span> Loading exit today calculation...
        </div>

        <!-- Error State -->
        <div v-else-if="avgPriceFromOrdersErrorExitToday" class="error-message">
          ❌ Error loading exit today data: {{ avgPriceFromOrdersErrorExitToday }}
        </div>

        <!-- No Data State -->
        <div v-else-if="!orderGroupsExitToday || orderGroupsExitToday.length === 0" class="no-data-message">
          <p>No order data found for exit today calculation.</p>
        </div>

        <!-- Detailed Calculation for Exit Today -->
        <div v-else>
          <div class="info-banner" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 1rem; margin-bottom: 1.5rem; border-radius: 4px;">
            <strong>ℹ️ Exit Today Calculation:</strong> This shows your average cost if you were to exit all positions today. 
            For call options, this uses the current unrealized P&L (current market value) instead of the original premium received.
          </div>

          <div v-for="(group, groupIndex) in orderGroupsExitToday" :key="`exit-order-group-${groupIndex}`" class="position-group">
            <div class="group-header clickable" @click="toggleGroupExpansion(groupIndex)">
              <span class="toggle-icon">{{ expandedGroups.has(groupIndex) ? '▼' : '▶' }}</span>
              Client {{ groupIndex + 1 }}: {{ group.mainPosition.account }}
              <span class="orders-count-badge">
                {{ (group.stockPurchases?.length || 0) + (group.stockSales?.length || 0) + (group.putSales?.length || 0) + (group.putBuybacks?.length || 0) + (group.callSales?.length || 0) + (group.callBuybacks?.length || 0) }} orders
              </span>
            </div>
            <transition name="slide-fade">
              <div v-show="expandedGroups.has(groupIndex)" class="group-content">
                <div class="parent-stock-container">
                  Section: A
                  <!-- Stock Purchases and Sales Side by Side -->
                  <div class="stock-sections-container">
                    <!-- Stock Purchases -->
                    <div class="stock-section-half">
                      <div v-if="group.stockPurchases && group.stockPurchases.length > 0" class="order-section order-stock-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>📍 Stock Purchases ({{ group.stockPurchases.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyStockPurchasesToClipboard(group.stockPurchases, groupIndex)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <!-- Stock Purchases Table -->
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.stockPurchases)" :key="`exit-stock-${groupIndex}-${orderIndex}`">
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.stockPurchases.reduce((sum: number, o: any) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ group.stockPurchases.reduce((sum: number, o: any) => sum + Number(o.totalCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No stock purchases found</div>
                    </div>

                    <!-- Stock Sales -->
                    <div class="stock-section-half">
                      <div v-if="group.stockSales && group.stockSales.length > 0" class="order-section order-stock-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>💰 Stock Sales ({{ group.stockSales.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyStockSalesToClipboard(group.stockSales, groupIndex)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <!-- Stock Sales Table -->
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Proceeds</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.stockSales)" :key="`exit-stock-sale-${groupIndex}-${orderIndex}`">
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.stockSales.reduce((sum: number, o: any) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ group.stockSales.reduce((sum: number, o: any) => sum + Number(o.totalCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No stock sales found</div>
                    </div>
                  </div>

                  <!-- Net Stock Summary -->
                  <div v-if="group.netStockCost !== undefined || group.totalShares" class="order-section" style="padding: 1rem;">
                    <div style="font-size: 1.1rem; margin-bottom: 0.75rem;">                    
                      <!-- Net Stock Cost Calculation -->
                      <div style="margin-bottom: 0.5rem;">
                        <div style="font-weight: 600; color: #495057; margin-bottom: 0.25rem;">Net Stock Cost:</div>
                        <div style="margin-left: 1rem; color: #6c757d; font-size: 0.95rem;">
                          <div>Total Stock Purchases: ${{ group.stockPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div v-if="group.stockSaleProceeds && group.stockSaleProceeds > 0">Less: Stock Sales: ${{ Math.abs(group.stockSaleProceeds).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div style="border-top: 1px solid #dee2e6; margin-top: 0.25rem; padding-top: 0.25rem; font-weight: 600; color: #28a745; font-size: 1.05rem;">
                            = ${{ group.netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                          </div>
                        </div>
                      </div>
                      
                      <!-- Current Shares Calculation -->
                      <div>
                        <div style="font-weight: 600; color: #495057; margin-bottom: 0.25rem;">Current Shares:</div>
                        <div style="margin-left: 1rem; color: #6c757d; font-size: 0.95rem;">
                          <div>Total Purchased: {{ group.stockPurchases.reduce((sum: number, o: any) => sum + o.quantity, 0).toLocaleString() }} shares</div>
                          <div v-if="group.stockSales && group.stockSales.length > 0">Less: Sold: {{ group.stockSales.reduce((sum: number, o: any) => sum + o.quantity, 0).toLocaleString() }} shares</div>
                          <div style="border-top: 1px solid #dee2e6; margin-top: 0.25rem; padding-top: 0.25rem; font-weight: 600; color: #28a745; font-size: 1.05rem;">
                            = {{ group.totalShares.toLocaleString() }} shares
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <div class="parent-put-container">
                  Section: B
                  <!-- Put Sections Side by Side -->
                  <div class="stock-sections-container">
                    <!-- Put Premium Received -->
                    <div class="stock-section-half">
                      <div v-if="group.putSales && group.putSales.length > 0" class="order-section order-put-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>📉 Put Premium Received ({{ group.putSales.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyPutSalesToClipboard(group.putSales, groupIndex, group.putPremiumReceived)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Option</th>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Premium</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.putSales)" :key="`exit-put-${groupIndex}-${orderIndex}`">
                                <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td colspan="2"><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.putSales.reduce((sum: number, o: any) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No put premium received</div>
                    </div>

                    <!-- Put Buybacks (Closing Buys) -->
                    <div class="stock-section-half">
                      <div v-if="group.putBuybacks && group.putBuybacks.length > 0" class="order-section order-put-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>🔄 Put Buybacks ({{ group.putBuybacks.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyPutBuybacksToClipboard(group.putBuybacks, groupIndex, group.putBuybackCost)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Option</th>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.putBuybacks)" :key="`exit-put-buyback-${groupIndex}-${orderIndex}`">
                                <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td colspan="2"><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.putBuybacks.reduce((sum: number, o: any) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ Math.abs(group.putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No put buybacks found</div>
                    </div>                  
                  </div>

                  <!-- Net Put Summary -->
                  <div v-if="(group.putSales && group.putSales.length > 0) || (group.putBuybacks && group.putBuybacks.length > 0)" class="order-section" style="padding: 1rem;">
                    <div style="font-size: 1.1rem; margin-bottom: 0.75rem;">                    
                      <!-- Net Put Cash Flow Calculation -->
                      <div>
                        <div style="font-weight: 600; color: #495057; margin-bottom: 0.25rem;">📊Net Put Cash Flow:</div>
                        <div style="margin-left: 1rem; color: #6c757d; font-size: 0.95rem;">
                          <div v-if="group.putPremiumReceived > 0">Put Premium Received: ${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div v-if="group.putBuybackCost && group.putBuybackCost > 0">Less: Put Buyback Cost: ${{ Math.abs(group.putBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div style="border-top: 1px solid #dee2e6; margin-top: 0.25rem; padding-top: 0.25rem; font-weight: 600; color: #ff9800; font-size: 1.05rem;">
                            = ${{ group.netPutCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="parent-call-container">
                  Section: C
                  <!-- Call Sections Side by Side -->
                  <div class="stock-sections-container">
                    <!-- Call Premiums/Current Value -->
                    <div class="stock-section-half">
                      <div v-if="group.callSales && group.callSales.length > 0" class="order-section order-call-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>📞 Call Current Value ({{ group.callSales.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyCallSalesToClipboard(group.callSales, groupIndex, group.callPremiumReceived)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Option</th>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Current Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.callSales)" :key="`exit-call-${groupIndex}-${orderIndex}`">
                                <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td colspan="2"><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.callSales.reduce((sum: number, o: any) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No call premium received</div>
                    </div>

                    <!-- Call Buybacks (Closing Buys) -->
                    <div class="stock-section-half">
                      <div v-if="group.callBuybacks && group.callBuybacks.length > 0" class="order-section order-call-section">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>🔄 Call Buybacks ({{ group.callBuybacks.length }})</span>
                          <button 
                            class="copy-button" 
                            @click="copyCallBuybacksToClipboard(group.callBuybacks, groupIndex, group.callBuybackCost)"
                            title="Copy to clipboard (Excel-ready)"
                          >
                            📋 Copy
                          </button>
                        </div>
                        
                        <div class="stock-table-wrapper">
                          <table class="stock-purchases-table">
                            <thead>
                              <tr>
                                <th>Option</th>
                                <th>Settlement Date</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Total Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(order, orderIndex) in sortOrdersByDate(group.callBuybacks)" :key="`exit-call-buyback-${groupIndex}-${orderIndex}`">
                                <td>{{ parseOrderSymbol(order.symbol) }}</td>
                                <td>{{ formatOrderDate(order.orderDate) }}</td>
                                <td class="text-right">{{ order.quantity.toLocaleString() }}</td>
                                <td class="text-right">${{ Number(order.avgPrice).toFixed(2) }}</td>
                                <td class="text-right">${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="total-row">
                                <td colspan="2"><strong>Total</strong></td>
                                <td class="text-right"><strong>{{ group.callBuybacks.reduce((sum: number, o: any) => sum + o.quantity, 0).toLocaleString() }}</strong></td>
                                <td class="text-right">-</td>
                                <td class="text-right"><strong>${{ Math.abs(group.callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <div v-else class="order-section no-orders">No call buybacks found</div>
                    </div>
                  </div>

                  <!-- Net Call Summary -->
                  <div v-if="(group.callSales && group.callSales.length > 0) || (group.callBuybacks && group.callBuybacks.length > 0)" class="order-section" style="padding: 1rem;">
                    <div style="font-size: 1.1rem; margin-bottom: 0.75rem;">                    
                      <!-- Net Call Cash Flow Calculation -->
                      <div>
                        <div style="font-weight: 600; color: #495057; margin-bottom: 0.25rem;">📊 Net Call Cash Flow:</div>
                        <div style="margin-left: 1rem; color: #6c757d; font-size: 0.95rem;">
                          <div v-if="group.callPremiumReceived > 0">Call Current Value: ${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div v-if="group.callBuybackCost && group.callBuybackCost > 0">Less: Call Buyback Cost: ${{ Math.abs(group.callBuybackCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                          <div style="border-top: 1px solid #dee2e6; margin-top: 0.25rem; padding-top: 0.25rem; font-weight: 600; color: #2196f3; font-size: 1.05rem;">
                            = ${{ group.netCallCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Calculation summary for this client -->
                <div class="group-calculation">
                  <div class="calc-line">📊 <strong>Calculation:</strong></div>
                  <div class="calc-line indent" style="border-top: 1px solid #dee2e6; margin-top: 0.5rem; padding-top: 0.5rem;"><strong>Total Net Cost = ${{ group.netStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(group.netPutCashFlow || group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(group.netCallCashFlow || group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} = ${{ group.netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></div>
                  <div class="calc-line indent"><strong>Adjusted Avg Price = ${{ group.netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ {{ group.totalShares.toLocaleString() }} = ${{ group.adjustedAvgPricePerShare.toFixed(2) }} per share</strong></div>
                </div>
              </div>
            </transition>
          </div>

          <!-- Overall adjusted average for Exit Today -->
          <div v-if="overallAdjustedAvgPriceFromOrdersExitToday !== null" class="overall-adjusted-section">
            <div class="overall-adjusted-header">
              🎯 Overall Adjusted Average (Exit Today): ${{ overallAdjustedAvgPriceFromOrdersExitToday.toFixed(2) }} per share
            </div>
            <div class="overall-calculation-breakdown">
              <div class="breakdown-line">Total Net Cost = {{ orderGroupsExitToday.map((g) => `$${g.netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' + ') }} = ${{ totalNetCostExitToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
              <div class="breakdown-line">Total Main Qty = {{ orderGroupsExitToday.map((g) => g.totalShares.toLocaleString()).join(' + ') }} = {{ totalSharesExitToday.toLocaleString() }}</div>
              <div class="breakdown-line"><strong>Overall Adjusted Average = ${{ totalNetCostExitToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ {{ totalSharesExitToday.toLocaleString() }} = ${{ overallAdjustedAvgPriceFromOrdersExitToday.toFixed(2) }}</strong></div>
            </div>
          </div>
        </div>
      </div>
      <!-- End of Exit Orders Content -->

    </div>
  </transition>
</template>

<style scoped>
@import '../styles/scoped-styles.css';
</style>

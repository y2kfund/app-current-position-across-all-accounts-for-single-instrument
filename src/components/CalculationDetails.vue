<script setup lang="ts">
import { ref } from 'vue'

interface Position {
  symbol: string
  account?: string
  quantity: number
  avgPrice: number
  totalCost: number
}

interface PositionGroup {
  mainPosition: Position
  callPositions: Position[]
  putPositions: Position[]
  callPositionsTotalCost: number
  netCostExcludingPuts: number
  adjustedAvgPricePerShare: number
}

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
  putSales: OrderCalculation[]
  callSales: OrderCalculation[]
  totalStockCost: number
  putPremiumReceived: number
  callPremiumReceived: number
  netCost: number
  totalShares: number
  adjustedAvgPricePerShare: number
}

interface Props {
  showCalculationDetails: boolean
  avgPriceCalculationTab: 'positions' | 'orders'
  positionGroups: PositionGroup[]
  orderGroups: OrderGroup[]
  overallAdjustedAvgPrice: number | null
  overallAdjustedAvgPriceFromOrders: number | null
  totalNetCostAllClients: number
  totalMainQuantityAllClients: number
  totalNetCost: number
  totalShares: number
  isAvgPriceFromOrdersLoading: boolean
  avgPriceFromOrdersError: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:avgPriceCalculationTab': [value: 'positions' | 'orders']
}>()

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
    return `${ticker} ${expiry} ${strike} ${right}`
  }
  
  // If not an option symbol, return as is
  return text
}
</script>

<template>
  <transition name="slide-fade">
    <div v-show="showCalculationDetails" class="calculation-details">
      <h2>Average Price calculation details :</h2>

      <!-- Tabs for Calculation Methods -->
      <div class="calculation-tabs">
        <button
          class="tab-button"
          :class="{ active: avgPriceCalculationTab === 'positions' }"
          @click="emit('update:avgPriceCalculationTab', 'positions')"
        >
          Calculation from Positions
        </button>
        <button
          class="tab-button"
          :class="{ active: avgPriceCalculationTab === 'orders' }"
          @click="emit('update:avgPriceCalculationTab', 'orders')"
        >
          Calculation from Orders
        </button>
      </div>

      <!-- Positions Tab Content -->
      <div v-if="avgPriceCalculationTab === 'positions'">
        <!-- Group by main position + its attached positions -->
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
            <div class="breakdown-line">Total Net Cost = {{ positionGroups.map((g: any) => `$${g.netCostExcludingPuts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' + ') }} = ${{ totalNetCostAllClients.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
            <div class="breakdown-line">Total Main Qty = {{ positionGroups.map((g: any) => g.mainPosition.quantity.toLocaleString()).join(' + ') }} = {{ totalMainQuantityAllClients.toLocaleString() }}</div>
            <div class="breakdown-line"><strong>Overall Adjusted Average = ${{ totalNetCostAllClients.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ {{ totalMainQuantityAllClients.toLocaleString() }} = ${{ overallAdjustedAvgPrice.toFixed(2) }}</strong></div>
          </div>
        </div>
      </div>

      <!-- Orders Tab Content -->
      <div v-else-if="avgPriceCalculationTab === 'orders'">
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
            </div>
            <transition name="slide-fade">
              <div v-show="expandedGroups.has(groupIndex)" class="group-content">
                <!-- Stock Purchases -->
                <div v-if="group.stockPurchases && group.stockPurchases.length > 0" class="order-section order-stock-section">
                  <div class="order-header">📍 Stock Purchases ({{ group.stockPurchases.length }})</div>
                  <div v-for="(order, orderIndex) in group.stockPurchases" :key="`stock-${groupIndex}-${orderIndex}`" class="order-line main-order">
                    <span class="position-icon">📍</span>
                    <span class="order-symbol">{{ order.symbol }}</span>
                    <span class="order-calc">@ ${{ Number(order.avgPrice).toFixed(2) }} × {{ order.quantity.toLocaleString() }} = ${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                  </div>
                </div>
                <div v-else class="order-section no-orders">No stock purchases found</div>

                <!-- Put Premium Received -->
                <div v-if="group.putSales && group.putSales.length > 0" class="order-section order-put-section">
                  <div class="order-header">📉 Put Premium Received (subtract from cost)</div>
                  <div v-for="(order, orderIndex) in group.putSales" :key="`put-${groupIndex}-${orderIndex}`" class="order-line put-order">
                    <span class="order-symbol">{{ parseOrderSymbol(order.symbol) }}</span>
                    <span class="order-calc">@ ${{ Number(order.avgPrice).toFixed(2) }} × {{ order.quantity.toLocaleString() }} = ${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                  </div>
                  <div class="put-subtotal">
                    Subtotal Put Premium: ${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </div>
                </div>

                <!-- Call Premiums Received -->
                <div v-if="group.callSales && group.callSales.length > 0" class="order-section order-call-section">
                  <div class="order-header">📞 Call Premiums Received (subtract from cost)</div>
                  <div v-for="(order, orderIndex) in group.callSales" :key="`call-${groupIndex}-${orderIndex}`" class="order-line call-order">
                    <span class="order-symbol">{{ parseOrderSymbol(order.symbol) }}</span>
                    <span class="order-calc">@ ${{ Number(order.avgPrice).toFixed(2) }} × {{ order.quantity.toLocaleString() }} = ${{ Number(order.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                  </div>
                  <div class="call-subtotal">
                    Subtotal Call Premium: ${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </div>
                </div>

                <!-- Calculation summary for this client -->
                <div class="group-calculation">
                  <div class="calc-line">📊 <strong>Calculation:</strong></div>
                  <div class="calc-line indent">Stock Purchase Cost: -${{ group.totalStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent" v-if="group.putPremiumReceived > 0">Put Premium Received: +${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent" v-if="group.callPremiumReceived > 0">Call Premium Received: +${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                  <div class="calc-line indent" style="border-top: 1px solid #dee2e6; margin-top: 0.5rem; padding-top: 0.5rem;"><strong>Net Cost = ${{ group.totalStockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(group.putPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} - ${{ Math.abs(group.callPremiumReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} = ${{ group.netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong></div>
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

    </div>
  </transition>
</template>

<style scoped>
@import '../styles/scoped-styles.css';
</style>

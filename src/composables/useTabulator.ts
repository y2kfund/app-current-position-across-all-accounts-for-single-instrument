import { ref, watch, nextTick, onBeforeUnmount, type Ref } from 'vue'
import { TabulatorFull as Tabulator, type ColumnDefinition } from 'tabulator-tables'

export interface UseTabulatorOptions {
  data: Ref<any[] | undefined>
  columns: ColumnDefinition[]
  isSuccess: Ref<boolean>
  layout?: 'fitData' | 'fitColumns' | 'fitDataFill' | 'fitDataStretch' | 'fitDataTable'
  height?: string | number
  placeholder?: string
}

export function useTabulator(options: UseTabulatorOptions) {
  const tableDiv = ref<HTMLDivElement | null>(null)
  let tabulator: Tabulator | null = null
  const isTabulatorReady = ref(false)
  const isTableInitialized = ref(false)

  function initializeTabulator() {
    if (!tableDiv.value || !options.data.value) {
      console.log('⚠️ Cannot initialize: tableDiv or data missing')
      return
    }

    // Destroy existing table
    if (tabulator) {
      try {
        tabulator.destroy()
        console.log('🗑️ Destroyed existing tabulator')
      } catch (error) {
        console.warn('Error destroying tabulator:', error)
      }
      tabulator = null
    }

    isTabulatorReady.value = false

    console.log('🚀 Initializing Tabulator with', options.data.value.length, 'rows')

    try {
      tabulator = new Tabulator(tableDiv.value, {
        data: options.data.value,
        layout: options.layout || 'fitColumns',
        //height: options.height || '100%',
        resizableColumns: true,
        placeholder: options.placeholder || 'No data available',
        headerSortElement: '<span></span>',
        columns: options.columns
      })

      isTabulatorReady.value = true
      console.log('✅ Tabulator initialized successfully')
    } catch (error) {
      console.error('❌ Error creating Tabulator:', error)
    }
  }

  // Watch for BOTH data ready AND DOM ready
  watch([() => options.isSuccess.value, tableDiv], async ([isSuccess, divRef]) => {
    console.log('👀 Watch triggered - isSuccess:', isSuccess, 'divRef:', !!divRef, 'isTableInitialized:', isTableInitialized.value)

    if (isSuccess && divRef && !isTableInitialized.value) {
      await nextTick()
      console.log('🎯 Conditions met, initializing table with', options.data.value?.length, 'rows')
      initializeTabulator()
      isTableInitialized.value = true
    }
  }, { immediate: true })

  // Watch for data changes after initialization
  watch(() => options.data.value, async (newData) => {
    if (!tabulator || !newData) return

    console.log('🔄 Data changed, updating table with', newData.length, 'rows')

    try {
      await nextTick()
      tabulator.replaceData(newData)
    } catch (error) {
      console.warn('Error updating table data:', error)
      // If there's an error, rebuild the table
      initializeTabulator()
    }
  }, { deep: true })

  onBeforeUnmount(() => {
    console.log('👋 Cleaning up tabulator')
    if (tabulator) {
      tabulator.destroy()
    }
  })

  return {
    tableDiv,
    tabulator: ref(tabulator),
    isTabulatorReady,
    isTableInitialized,
    initializeTabulator
  }
}
import { ref, watch, nextTick, onBeforeUnmount, type Ref } from 'vue'
import { TabulatorFull as Tabulator, type ColumnDefinition, type Options } from 'tabulator-tables'

export interface UseTabulatorOptions {
  data: Ref<any[] | undefined>
  columns: ColumnDefinition[]
  isSuccess: Ref<boolean>
  layout?: 'fitData' | 'fitColumns' | 'fitDataFill' | 'fitDataStretch' | 'fitDataTable'
  height?: string | number
  placeholder?: string
  rowFormatter?: (row: any) => void | Promise<void>
}

export function useTabulator(options: UseTabulatorOptions) {
  const tableDiv = ref<HTMLDivElement | null>(null)
  const tabulator = ref<Tabulator | null>(null)
  const isTabulatorReady = ref(false)
  const isTableInitialized = ref(false)

  function initializeTabulator() {
    if (!tableDiv.value || !options.data.value) {
      console.log('⚠️ Cannot initialize: tableDiv or data missing')
      return
    }

    // Check if element is visible
    if (tableDiv.value.offsetParent === null) {
      console.log('⚠️ Table div is not visible, skipping initialization')
      return
    }

    // Destroy existing table
    if (tabulator.value) {
      try {
        tabulator.value.destroy()
        console.log('🗑️ Destroyed existing tabulator')
      } catch (error) {
        console.warn('Error destroying tabulator:', error)
      }
      tabulator.value = null
    }

    isTabulatorReady.value = false

    console.log('🚀 Initializing Tabulator with', options.data.value.length, 'rows')

    try {
      const config: Options = {
        data: options.data.value,
        layout: options.layout || 'fitColumns',
        // Remove fixed height - let it auto-size based on content
        resizableColumns: true,
        placeholder: options.placeholder || 'No data available',
        headerSortElement: '<span></span>',
        columns: options.columns,
        reactiveData: true,
        // Add these for better auto-sizing
        layoutColumnsOnNewData: true,
        autoResize: true
      }

      // Add rowFormatter if provided
      if (options.rowFormatter) {
        config.rowFormatter = options.rowFormatter
      }

      tabulator.value = new Tabulator(tableDiv.value, config)

      isTabulatorReady.value = true
      isTableInitialized.value = true
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
      
      // Check if element is visible
      if (divRef.offsetParent !== null) {
        console.log('🎯 Conditions met, initializing table with', options.data.value?.length, 'rows')
        initializeTabulator()
      } else {
        console.log('⏸️ Element not visible yet, will retry')
        // Set up a short retry mechanism
        setTimeout(() => {
          if (divRef.offsetParent !== null && !isTableInitialized.value) {
            console.log('🚀 Initializing after visibility check')
            initializeTabulator()
          }
        }, 100)
      }
    }
  }, { immediate: true })

  // Watch for data changes after initialization
  watch(() => options.data.value, async (newData) => {
    if (!tabulator.value || !newData) return

    console.log('🔄 Data changed, updating table with', newData.length, 'rows')

    try {
      await nextTick()
      tabulator.value.setData(newData)
    } catch (error) {
      console.warn('Error updating table data:', error)
      // If there's an error, rebuild the table
      initializeTabulator()
    }
  }, { deep: true })

  onBeforeUnmount(() => {
    console.log('👋 Cleaning up tabulator')
    if (tabulator.value) {
      tabulator.value.destroy()
    }
  })

  return {
    tableDiv,
    tabulator,
    isTabulatorReady,
    isTableInitialized,
    initializeTabulator
  }
}
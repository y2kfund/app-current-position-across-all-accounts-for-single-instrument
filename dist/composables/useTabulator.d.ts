import { Ref } from 'vue';
import { ColumnDefinition } from 'tabulator-tables';
export interface UseTabulatorOptions {
    data: Ref<any[] | undefined>;
    columns: ColumnDefinition[];
    isSuccess: Ref<boolean>;
    layout?: 'fitData' | 'fitColumns' | 'fitDataFill' | 'fitDataStretch' | 'fitDataTable';
    height?: string | number;
    placeholder?: string;
}
export declare function useTabulator(options: UseTabulatorOptions): {
    tableDiv: Ref<HTMLDivElement | null, HTMLDivElement | null>;
    tabulator: any;
    isTabulatorReady: Ref<boolean, boolean>;
    isTableInitialized: Ref<boolean, boolean>;
    initializeTabulator: () => void;
};

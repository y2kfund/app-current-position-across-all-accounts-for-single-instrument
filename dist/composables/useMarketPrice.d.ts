import { Ref } from 'vue';
export declare function useMarketPrice(conid: Ref<number | null>): {
    price: Ref<number | null, number | null>;
    isLoading: Ref<boolean, boolean>;
    error: Ref<string | null, string | null>;
    refetch: () => void;
};

import { Ref } from 'vue';
interface MarketPriceData {
    symbol: string;
    conid: number;
    market_price: number;
    last_fetched_at: string;
}
export declare function useMarketPrice(conid: Ref<number | null>, symbolRoot: string): {
    marketData: Ref<{
        symbol: string;
        conid: number;
        market_price: number;
        last_fetched_at: string;
    } | null, MarketPriceData | {
        symbol: string;
        conid: number;
        market_price: number;
        last_fetched_at: string;
    } | null>;
    isLoading: Ref<boolean, boolean>;
    error: Ref<string | null, string | null>;
    refetch: () => void;
};
export {};

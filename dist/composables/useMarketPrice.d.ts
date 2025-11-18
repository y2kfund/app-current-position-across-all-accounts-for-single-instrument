import { Ref } from 'vue';
interface MarketPriceData {
    symbol: string;
    conid: number;
    market_price: number;
    week_52_high?: number | null;
    week_52_low?: number | null;
    pe_ratio?: number | null;
    eps?: number | null;
    market_cap?: number | null;
    computed_peg_ratio?: number | null;
    last_fetched_at: string;
}
export declare function useMarketPrice(conid: Ref<number | null>, symbolRoot: string): {
    marketData: Ref<{
        symbol: string;
        conid: number;
        market_price: number;
        week_52_high?: number | null | undefined;
        week_52_low?: number | null | undefined;
        pe_ratio?: number | null | undefined;
        eps?: number | null | undefined;
        market_cap?: number | null | undefined;
        computed_peg_ratio?: number | null | undefined;
        last_fetched_at: string;
    } | null, MarketPriceData | {
        symbol: string;
        conid: number;
        market_price: number;
        week_52_high?: number | null | undefined;
        week_52_low?: number | null | undefined;
        pe_ratio?: number | null | undefined;
        eps?: number | null | undefined;
        market_cap?: number | null | undefined;
        computed_peg_ratio?: number | null | undefined;
        last_fetched_at: string;
    } | null>;
    isLoading: Ref<boolean, boolean>;
    error: Ref<string | null, string | null>;
    refetch: () => void;
};
export {};

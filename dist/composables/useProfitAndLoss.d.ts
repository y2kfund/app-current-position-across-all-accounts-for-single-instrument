import { Ref } from 'vue';
interface CalculationBreakdown {
    totalShares: number;
    avgCostPerShare: number;
    totalCostBasis: number;
    currentPricePerShare: number;
    currentMarketValue: number;
    unrealizedPnL: number;
    pnlPercentage: number;
}
export declare function useProfitAndLoss(overallAdjustedAvgPrice: Ref<number | null>, totalMainQuantity: Ref<number>, currentMarketPrice: Ref<number | null>): {
    totalCostBasis: Ref<number | null, number | null>;
    currentMarketValue: Ref<number | null, number | null>;
    unrealizedPnL: Ref<number | null, number | null>;
    pnlPercentage: Ref<number | null, number | null>;
    isProfitable: Ref<boolean, boolean>;
    calculationBreakdown: import('vue').ComputedRef<CalculationBreakdown | null>;
    isLoading: Ref<boolean, boolean>;
    error: Ref<string | null, string | null>;
};
export {};

import { Ref } from 'vue';
import { Position } from '@y2kfund/core';
interface CalculationBreakdown {
    totalShares: number;
    avgCostPerShare: number;
    totalCostBasis: number;
    currentPricePerShare: number;
    currentMarketValue: number;
    unrealizedPnL: number;
    pnlPercentage: number;
}
interface PositionBreakdown {
    account: string;
    strike: number | null;
    expiry: string | null;
    quantity: number;
    premiumReceived: number;
    currentValue: number;
    positionPnL: number;
    symbol: string;
}
interface OptionsCalculationBreakdown {
    totalContracts: number;
    optionType: 'PUT' | 'CALL' | 'MIXED';
    positionType: 'SHORT' | 'LONG' | 'MIXED';
    totalPremiumReceived: number;
    currentMarketLiability: number;
    unrealizedPnL: number;
    pnlPercentage: number;
    positions: PositionBreakdown[];
}
export declare function useProfitAndLoss(overallAdjustedAvgPrice: Ref<number | null>, totalMainQuantity: Ref<number>, currentMarketPrice: Ref<number | null>, putPositions?: Ref<Position[] | undefined>, callPositions?: Ref<Position[] | undefined>): {
    totalCostBasis: Ref<number | null, number | null>;
    currentMarketValue: Ref<number | null, number | null>;
    unrealizedPnL: Ref<number | null, number | null>;
    pnlPercentage: Ref<number | null, number | null>;
    isProfitable: Ref<boolean, boolean>;
    calculationBreakdown: import('vue').ComputedRef<CalculationBreakdown | OptionsCalculationBreakdown | null>;
    isLoading: Ref<boolean, boolean>;
    error: Ref<string | null, string | null>;
};
export {};

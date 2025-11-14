import { Ref } from 'vue';
import { Position } from '@y2kfund/core';
interface StockCapitalBreakdown {
    assetType: 'STK';
    totalShares: number;
    pricePerShare: number;
    totalCapital: number;
}
interface OptionsPositionDetail {
    account: string;
    symbol: string;
    quantity: number;
    marketPrice: number;
    marketValue: number;
    optionType: 'PUT' | 'CALL';
}
interface OptionsCapitalBreakdown {
    assetType: 'OPT';
    positions: OptionsPositionDetail[];
    totalOptionsCapital: number;
}
type CapitalBreakdown = StockCapitalBreakdown | OptionsCapitalBreakdown;
export declare function useCapitalUsed(assetType: Ref<string | null>, totalContractQuantity: Ref<number>, currentMarketPrice: Ref<number | null>, positions: Ref<Position[] | undefined>, putPositions: Ref<Position[] | undefined>, callPositions: Ref<Position[] | undefined>): {
    totalCapitalUsed: import('vue').ComputedRef<number | null>;
    calculationBreakdown: import('vue').ComputedRef<CapitalBreakdown | null>;
    isLoading: import('vue').ComputedRef<boolean>;
    error: import('vue').ComputedRef<string | null>;
};
export {};

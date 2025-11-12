import { Ref } from 'vue';
import { Position } from '@y2kfund/core';
interface PositionCalculation {
    symbol: string;
    avgPrice: number;
    quantity: number;
    totalCost: number;
    isAttached: boolean;
    mappingKey?: string;
    account?: string;
}
interface PositionGroup {
    mainPosition: PositionCalculation;
    attachedPositions: PositionCalculation[];
    callPositions: PositionCalculation[];
    putPositions: PositionCalculation[];
    groupTotalCost: number;
    groupTotalQuantity: number;
    callPositionsTotalCost: number;
    netCostExcludingPuts: number;
    adjustedAvgPricePerShare: number;
}
export declare function useAverageCostPrice(positions: Ref<Position[] | undefined>, userId: string | null | undefined): {
    averageCostPrice: Ref<number | null, number | null>;
    overallAdjustedAvgPrice: import('vue').ComputedRef<number | null>;
    totalCost: Ref<number, number>;
    totalQuantity: Ref<number, number>;
    mainPositionsCount: Ref<number, number>;
    attachedPositionsCount: Ref<number, number>;
    positionBreakdown: Ref<{
        symbol: string;
        avgPrice: number;
        quantity: number;
        totalCost: number;
        isAttached: boolean;
        mappingKey?: string | undefined;
        account?: string | undefined;
    }[], PositionCalculation[] | {
        symbol: string;
        avgPrice: number;
        quantity: number;
        totalCost: number;
        isAttached: boolean;
        mappingKey?: string | undefined;
        account?: string | undefined;
    }[]>;
    positionGroups: Ref<{
        mainPosition: {
            symbol: string;
            avgPrice: number;
            quantity: number;
            totalCost: number;
            isAttached: boolean;
            mappingKey?: string | undefined;
            account?: string | undefined;
        };
        attachedPositions: {
            symbol: string;
            avgPrice: number;
            quantity: number;
            totalCost: number;
            isAttached: boolean;
            mappingKey?: string | undefined;
            account?: string | undefined;
        }[];
        callPositions: {
            symbol: string;
            avgPrice: number;
            quantity: number;
            totalCost: number;
            isAttached: boolean;
            mappingKey?: string | undefined;
            account?: string | undefined;
        }[];
        putPositions: {
            symbol: string;
            avgPrice: number;
            quantity: number;
            totalCost: number;
            isAttached: boolean;
            mappingKey?: string | undefined;
            account?: string | undefined;
        }[];
        groupTotalCost: number;
        groupTotalQuantity: number;
        callPositionsTotalCost: number;
        netCostExcludingPuts: number;
        adjustedAvgPricePerShare: number;
    }[], PositionGroup[] | {
        mainPosition: {
            symbol: string;
            avgPrice: number;
            quantity: number;
            totalCost: number;
            isAttached: boolean;
            mappingKey?: string | undefined;
            account?: string | undefined;
        };
        attachedPositions: {
            symbol: string;
            avgPrice: number;
            quantity: number;
            totalCost: number;
            isAttached: boolean;
            mappingKey?: string | undefined;
            account?: string | undefined;
        }[];
        callPositions: {
            symbol: string;
            avgPrice: number;
            quantity: number;
            totalCost: number;
            isAttached: boolean;
            mappingKey?: string | undefined;
            account?: string | undefined;
        }[];
        putPositions: {
            symbol: string;
            avgPrice: number;
            quantity: number;
            totalCost: number;
            isAttached: boolean;
            mappingKey?: string | undefined;
            account?: string | undefined;
        }[];
        groupTotalCost: number;
        groupTotalQuantity: number;
        callPositionsTotalCost: number;
        netCostExcludingPuts: number;
        adjustedAvgPricePerShare: number;
    }[]>;
    isLoading: Ref<boolean, boolean>;
    error: Ref<string | null, string | null>;
    refetch: () => Promise<void>;
};
export {};

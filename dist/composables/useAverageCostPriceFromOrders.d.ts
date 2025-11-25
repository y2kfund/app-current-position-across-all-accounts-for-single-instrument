import { Ref } from 'vue';
import { Position } from '@y2kfund/core';
interface OrderCalculation {
    symbol: string;
    side: string;
    quantity: number;
    avgPrice: number;
    totalCost: number;
    secType: string;
    right?: string;
    strike?: number;
    account: string;
    orderDate: string;
}
interface PositionOrderGroup {
    mainPosition: {
        symbol: string;
        account: string;
        quantity: number;
    };
    orders: OrderCalculation[];
    stockPurchases: OrderCalculation[];
    stockPurchaseCost: number;
    putSales: OrderCalculation[];
    putPremiumReceived: number;
    callSales: OrderCalculation[];
    callPremiumReceived: number;
    totalStockCost: number;
    totalPremiumReceived: number;
    netCost: number;
    totalShares: number;
    adjustedAvgPricePerShare: number;
}
export declare function useAverageCostPriceFromOrders(positions: Ref<Position[] | undefined>, userId: string | null | undefined): {
    averageCostPriceFromOrders: Ref<number | null, number | null>;
    overallAdjustedAvgPriceFromOrders: import('vue').ComputedRef<number | null>;
    totalNetCost: Ref<number, number>;
    totalShares: Ref<number, number>;
    orderGroups: Ref<{
        mainPosition: {
            symbol: string;
            account: string;
            quantity: number;
        };
        orders: {
            symbol: string;
            side: string;
            quantity: number;
            avgPrice: number;
            totalCost: number;
            secType: string;
            right?: string | undefined;
            strike?: number | undefined;
            account: string;
            orderDate: string;
        }[];
        stockPurchases: {
            symbol: string;
            side: string;
            quantity: number;
            avgPrice: number;
            totalCost: number;
            secType: string;
            right?: string | undefined;
            strike?: number | undefined;
            account: string;
            orderDate: string;
        }[];
        stockPurchaseCost: number;
        putSales: {
            symbol: string;
            side: string;
            quantity: number;
            avgPrice: number;
            totalCost: number;
            secType: string;
            right?: string | undefined;
            strike?: number | undefined;
            account: string;
            orderDate: string;
        }[];
        putPremiumReceived: number;
        callSales: {
            symbol: string;
            side: string;
            quantity: number;
            avgPrice: number;
            totalCost: number;
            secType: string;
            right?: string | undefined;
            strike?: number | undefined;
            account: string;
            orderDate: string;
        }[];
        callPremiumReceived: number;
        totalStockCost: number;
        totalPremiumReceived: number;
        netCost: number;
        totalShares: number;
        adjustedAvgPricePerShare: number;
    }[], PositionOrderGroup[] | {
        mainPosition: {
            symbol: string;
            account: string;
            quantity: number;
        };
        orders: {
            symbol: string;
            side: string;
            quantity: number;
            avgPrice: number;
            totalCost: number;
            secType: string;
            right?: string | undefined;
            strike?: number | undefined;
            account: string;
            orderDate: string;
        }[];
        stockPurchases: {
            symbol: string;
            side: string;
            quantity: number;
            avgPrice: number;
            totalCost: number;
            secType: string;
            right?: string | undefined;
            strike?: number | undefined;
            account: string;
            orderDate: string;
        }[];
        stockPurchaseCost: number;
        putSales: {
            symbol: string;
            side: string;
            quantity: number;
            avgPrice: number;
            totalCost: number;
            secType: string;
            right?: string | undefined;
            strike?: number | undefined;
            account: string;
            orderDate: string;
        }[];
        putPremiumReceived: number;
        callSales: {
            symbol: string;
            side: string;
            quantity: number;
            avgPrice: number;
            totalCost: number;
            secType: string;
            right?: string | undefined;
            strike?: number | undefined;
            account: string;
            orderDate: string;
        }[];
        callPremiumReceived: number;
        totalStockCost: number;
        totalPremiumReceived: number;
        netCost: number;
        totalShares: number;
        adjustedAvgPricePerShare: number;
    }[]>;
    isLoading: Ref<boolean, boolean>;
    error: Ref<string | null, string | null>;
    refetch: () => Promise<void>;
};
export {};

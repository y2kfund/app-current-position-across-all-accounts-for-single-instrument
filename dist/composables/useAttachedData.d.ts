import { savePositionOrderMappings, Position } from '@y2kfund/core';
interface Trade {
    tradeID?: string;
    symbol: string;
    quantity: string;
    tradePrice: string;
    buySell: string;
    tradeDate: string;
    settleDateTarget: string;
    ibCommission: string;
    assetCategory: string;
    [key: string]: any;
}
interface Order {
    orderID?: string;
    symbol: string;
    quantity: string;
    price: string;
    orderDate: string;
    [key: string]: any;
}
export declare function useAttachedData(userId: string | undefined | null): {
    positionTradesMap: import('vue').ComputedRef<Map<string, Set<string>>>;
    positionPositionsMap: import('vue').ComputedRef<Map<string, Set<string>>>;
    positionOrdersMap: import('vue').ComputedRef<Map<string, Set<string>>>;
    getPositionKey: (position: any) => string;
    getAttachedTrades: (position: any) => Promise<Trade[]>;
    getAttachedOrders: (position: any) => Promise<Order[]>;
    fetchAttachedPositionsForDisplay: (position: any, attachedKeys: Set<string>) => Promise<Position[]>;
    positionTradeMappingsQuery: import('@tanstack/vue-query').UseQueryReturnType<Map<string, Set<string>>, Error>;
    positionPositionMappingsQuery: import('@tanstack/vue-query').UseQueryReturnType<Map<string, Set<string>>, Error>;
    positionOrderMappingsQuery: import('@tanstack/vue-query').UseQueryReturnType<Map<string, Set<string>>, Error>;
    isReady: import('vue').ComputedRef<boolean>;
    refetchMappings: () => Promise<void>;
    fetchTradesForSymbol: (symbolRoot: string, accountId: string) => Promise<Trade[]>;
    fetchOrdersForSymbol: (symbolRoot: string, accountId: string) => Promise<Order[]>;
    savePositionOrderMappings: typeof savePositionOrderMappings;
};
export {};

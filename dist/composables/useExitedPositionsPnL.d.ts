import { Ref } from 'vue';
interface ExitedOrder {
    id: string;
    symbol: string;
    buySell: string;
    quantity: number;
    tradePrice: number;
    tradeMoney: number;
    mtmPnl: number;
    dateTime: string;
    internal_account_id: string;
}
interface AccountBreakdown {
    internal_account_id: string;
    accountDisplayName: string;
    totalMtmPnL: number;
    orderCount: number;
    orders: ExitedOrder[];
}
interface ExitedPnLBreakdown {
    totalMtmPnL: number;
    orderCount: number;
    accountBreakdowns: AccountBreakdown[];
}
export declare function useExitedPositionsPnL(symbolRoot: Ref<string>, userId: Ref<string | null | undefined>, assetClass?: Ref<string | null>): {
    totalExitedPnL: Ref<number | null, number | null>;
    exitedOrdersBreakdown: Ref<{
        totalMtmPnL: number;
        orderCount: number;
        accountBreakdowns: {
            internal_account_id: string;
            accountDisplayName: string;
            totalMtmPnL: number;
            orderCount: number;
            orders: {
                id: string;
                symbol: string;
                buySell: string;
                quantity: number;
                tradePrice: number;
                tradeMoney: number;
                mtmPnl: number;
                dateTime: string;
                internal_account_id: string;
            }[];
        }[];
    } | null, ExitedPnLBreakdown | {
        totalMtmPnL: number;
        orderCount: number;
        accountBreakdowns: {
            internal_account_id: string;
            accountDisplayName: string;
            totalMtmPnL: number;
            orderCount: number;
            orders: {
                id: string;
                symbol: string;
                buySell: string;
                quantity: number;
                tradePrice: number;
                tradeMoney: number;
                mtmPnl: number;
                dateTime: string;
                internal_account_id: string;
            }[];
        }[];
    } | null>;
    isLoading: Ref<boolean, boolean>;
    error: Ref<string | null, string | null>;
    refetch: () => Promise<void>;
};
export {};

interface Position {
    symbol: string;
    account?: string;
    quantity: number;
    avgPrice: number;
    totalCost: number;
}
interface PositionGroup {
    mainPosition: Position;
    callPositions: Position[];
    putPositions: Position[];
    callPositionsTotalCost: number;
    netCostExcludingPuts: number;
    adjustedAvgPricePerShare: number;
}
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
interface OrderGroup {
    mainPosition: {
        symbol: string;
        account: string;
        quantity: number;
    };
    stockPurchases: OrderCalculation[];
    stockSales: OrderCalculation[];
    putSales: OrderCalculation[];
    putBuybacks: OrderCalculation[];
    callSales: OrderCalculation[];
    callBuybacks: OrderCalculation[];
    totalStockCost: number;
    stockSaleProceeds: number;
    netStockCost: number;
    putPremiumReceived: number;
    putBuybackCost: number;
    netPutCashFlow: number;
    callPremiumReceived: number;
    callBuybackCost: number;
    netCallCashFlow: number;
    netCost: number;
    totalShares: number;
    adjustedAvgPricePerShare: number;
}
interface Props {
    showCalculationDetails: boolean;
    avgPriceCalculationTab: 'orders' | 'positions';
    positionGroups: PositionGroup[];
    orderGroups: OrderGroup[];
    overallAdjustedAvgPrice: number | null;
    overallAdjustedAvgPriceFromOrders: number | null;
    totalNetCostAllClients: number;
    totalMainQuantityAllClients: number;
    totalNetCost: number;
    totalShares: number;
    isAvgPriceFromOrdersLoading: boolean;
    avgPriceFromOrdersError: string | null;
}
declare const _default: import('vue').DefineComponent<Props, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:avgPriceCalculationTab": (value: "positions" | "orders") => any;
}, string, import('vue').PublicProps, Readonly<Props> & Readonly<{
    "onUpdate:avgPriceCalculationTab"?: ((value: "positions" | "orders") => any) | undefined;
}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {}, any>;
export default _default;

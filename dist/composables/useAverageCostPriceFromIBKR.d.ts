import { Ref, ComputedRef } from 'vue';
interface Position {
    accounting_quantity?: number | null;
    avgPrice?: number | null;
    legal_entity?: string | null;
    internal_account_id?: string | null;
    symbol?: string | null;
    [key: string]: any;
}
interface PositionBreakdown {
    account: string;
    symbol: string;
    quantity: number;
    avgPrice: number;
    cost: number;
}
interface UseAverageCostPriceFromIBKRReturn {
    averageCostPriceFromIBKR: ComputedRef<number | null>;
    totalCostFromIBKR: ComputedRef<number>;
    totalSharesFromIBKR: ComputedRef<number>;
    positionBreakdown: ComputedRef<PositionBreakdown[]>;
    isLoading: Ref<boolean>;
    error: Ref<string | null>;
}
/**
 * Composable to calculate weighted average cost price from IBKR positions
 *
 * Formula: Average Price = Total Cost / Total Quantity
 * Where: Total Cost = Σ (quantity × avgPrice) for each position
 *
 * @param positions - Ref to array of positions from IBKR
 * @param userId - User ID (for validation/logging purposes)
 * @returns Object containing average price, totals, breakdown, and status
 */
export declare function useAverageCostPriceFromIBKR(positions: Ref<Position[] | null | undefined>, userId?: string | null): UseAverageCostPriceFromIBKRReturn;
export {};

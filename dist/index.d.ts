import { default as currentPositions } from './views/CurrentPositions.vue';
export { currentPositions };
export default currentPositions;
export interface currentPositionsProps {
    symbolRoot: string;
    userId?: string | null;
}

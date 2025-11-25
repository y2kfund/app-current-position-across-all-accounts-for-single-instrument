interface currentPositionsProps {
    symbolRoot: string;
    userId?: string | null;
}
declare const _default: import('vue').DefineComponent<currentPositionsProps, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    capitalUsedChanged: (...args: any[]) => void;
}, string, import('vue').PublicProps, Readonly<currentPositionsProps> & Readonly<{
    onCapitalUsedChanged?: ((...args: any[]) => any) | undefined;
}>, {
    symbolRoot: string;
    userId: string | null;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {
    tableDiv: HTMLDivElement;
}, HTMLDivElement>;
export default _default;

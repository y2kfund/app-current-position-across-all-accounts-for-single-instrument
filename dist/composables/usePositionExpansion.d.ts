export declare function usePositionExpansion(): {
    expandedPositions: import('vue').Ref<Set<string> & Omit<Set<string>, keyof Set<any>>, Set<string> | (Set<string> & Omit<Set<string>, keyof Set<any>>)>;
    processingPositions: import('vue').Ref<Set<string> & Omit<Set<string>, keyof Set<any>>, Set<string> | (Set<string> & Omit<Set<string>, keyof Set<any>>)>;
    togglePositionExpansion: (positionKey: string, tabulatorInstance: any) => void;
};

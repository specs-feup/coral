export enum Nullability {
    NOT_NULL = "NOT_NULL",
    MAYBE_NULL = "MAYBE_NULL",
    NULL = "NULL"
}

export interface Contract {
    target: string;
    entryState?: Nullability; 
    exitState?: Nullability;  
    unchanged?: boolean;
    isGlobal?: boolean;
    predicate?: { 
        targetParam: string; // e.g., "p"
        isEq: boolean;       // false means "returns true if p != NULL"
    };
}


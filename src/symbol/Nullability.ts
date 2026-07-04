export enum Nullability {
    NOT_NULL = "NOT_NULL",
    MAYBE_NULL = "MAYBE_NULL",
    NULL = "NULL"
}


export interface FieldContract {
    entryState?: Nullability;
    exitState?: Nullability;
    unchanged?: boolean;
}


export interface Contract {
    index?: number;
    target: string;
    isGlobal?: boolean;
    unchanged?: boolean;
    entryState?: Nullability;
    exitState?: Nullability;
    predicate?: any;
    fields?: Record<string, FieldContract>; 
    isRegex? : boolean
    compiledRegex?: RegExp;
}


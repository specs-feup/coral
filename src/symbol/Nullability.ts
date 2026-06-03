export enum Nullability {
    NOT_NULL = "NOT_NULL",
    MAYBE_NULL = "MAYBE_NULL",
    NULL = "NULL"
}

// Add this interface to represent a field's state
export interface FieldContract {
    entryState?: Nullability;
    exitState?: Nullability;
    unchanged?: boolean;
}

// Update your main Contract interface
export interface Contract {
    target: string;
    isGlobal?: boolean;
    unchanged?: boolean;
    entryState?: Nullability;
    exitState?: Nullability;
    predicate?: any; // Assuming you have this defined
    fields?: Record<string, FieldContract>; // <-- NEW: Dictionary of fields
}


export enum Nullability {
    NOT_NULL = "NOT_NULL",
    MAYBE_NULL = "MAYBE_NULL",
    NULL = "NULL"
}

export interface Contract {
    state: Nullability;
    isFinal: boolean;
    target: string;
}


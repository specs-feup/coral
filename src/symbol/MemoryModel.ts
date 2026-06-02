import { Nullability } from "./Nullability.js";

export type MemoryNode = PointerNode | ObjectNode | ConditionNode | VarNode;

export interface PointerNode {
    kind: "pointer";
    pointsTo: string; // The ID/name of the object this pointer points to (e.g., "myBox")
    isGlobal: boolean;
    state: Nullability;
}

export interface ObjectNode {
    kind: "object";
    fields: Set<string>; // Tracks known fields (e.g., Set("data", "next"))
    isStackAllocated: boolean; // True for `struct Box b;`, False for `malloc`
    isGlobal: boolean;
    state: Nullability;
}

export interface ConditionNode {
    kind: "condition";
    targetVar: string; // The pointer being evaluated (e.g., "myBox.data")
    isEqToNull: boolean; // True for `== NULL`, False for `!= NULL`
    isGlobal: boolean;
}

export interface VarNode {
    kind: "var";
    contains: string;
    isGlobal: boolean;
    state: Nullability;
}
import { Nullability } from "@specs-feup/coral/symbol/Nullability";
export type MemoryNode = PointerNode | ObjectNode | ConditionNode | VarNode | FunctionNode  ;

export interface PointerNode {
    kind: "pointer";
    state?: Nullability;
    pointsTo: Set<string>;
    exists?: boolean
}

export interface ObjectNode {
    kind: "object";
    fields: Set<string>;
    exists?: boolean;
}

export interface ConditionNode {
    kind: "condition";
    targetVar: string;
    isEqToNull: boolean; 
}

export interface VarNode {
    kind: "var";
    contains?: string;
    exists?: boolean
}


export interface FunctionNode{
    kind: "function",
    returnState?: Nullability
}
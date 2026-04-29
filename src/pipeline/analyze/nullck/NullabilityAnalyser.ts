import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import Node from "@specs-feup/flow/graph/Node";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import { BinaryOp, Expression, If, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import ContractViolationError from "@specs-feup/coral/error/null_safety/ContractViolationError";
import { ReturnStmt } from "@specs-feup/clava/api/Joinpoints.js";
import NullDereferenceError from "@specs-feup/coral/error/null_safety/NullDereferenceError";
export type NullabilityState = Map<string, Nullability>;

type DataflowStates = {
    inStates: NullabilityState;
    outStates: NullabilityState;
    returnStates: NullabilityState;
};

export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodes: CoralCfgNode.Class[] = [];
    private currentState: NullabilityState = new Map();

    constructor(fn: CoralFunctionNode.Class) {
        this.fn = fn;
    }

    apply(): void {
        this.#computeDefsAndUses();
    }

    #computeDefsAndUses() {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);

        let inStates: NullabilityState = new Map();
        let finalStates: NullabilityState = new Map();
        
        this.currentState.clear();

        // 1. Initialize State from Entry Contracts
        for (const param of fnSymbol.params) {
            const initial = param.initialNullability ?? Nullability.MAYBE_NULL;
            this.currentState.set(param.jp.name, initial);
            inStates.set(param.jp.name, initial);
        }

        this.nodes = [...this.fn.controlFlowNodes.expectAll(CoralCfgNode, "Nodes were previously inited as CoralCfgNode")];

        // 2. Traverse the CFG
        while (this.nodes.length > 0) {
            const node = this.nodes.shift()!;
            const res = this.#computeUse(node, inStates, finalStates);
            inStates = res.outStates;
            finalStates = res.returnStates;
        }

        finalStates = this.#mergeStates(inStates, finalStates);

        // 3. Validate End-of-Function Contracts
        for (const param of fnSymbol.params) {
            const finalStateExpected = param.finalNullability ?? Nullability.MAYBE_NULL;
            const actualState = finalStates.get(param.name) ?? Nullability.MAYBE_NULL;

            if (actualState !== finalStateExpected) {
                throw new ContractViolationError(
                    param.jp.originNode,
                    param.name,
                    param.finalNullability!,
                    actualState
                );
            }
        }
    }

    #computeUse(node: CoralCfgNode.Class, inStates: NullabilityState, finalStates: NullabilityState): DataflowStates {
        // MUST clone inStates so we don't accidentally mutate the previous node's outgoing state globally
        let outStates = new Map(inStates);
        let returnStates = new Map(finalStates);

        node.switch(
            Node.Case(VariableDeclarationNode, n => {
                if (n.jp.hasInit) {
                    node.addDef(n.jp);
                    const v = this.#computeVarDec(n.jp.init!, outStates);
                    outStates.set(n.jp.name, v);
                }
            }),
            
            Node.Case(ExpressionNode, n => {
                if (n.jp instanceof BinaryOp) {
                    const rightState = outStates.get(n.jp.right.code) ?? Nullability.MAYBE_NULL;
                    outStates.set(n.jp.left.code, rightState);
                }
            }),

            Node.Case(ReturnNode, n => {
                returnStates = this.#mergeStates(outStates, returnStates);
            }),

            Node.Case(ConditionNode, n => {
                if (n.jp instanceof If) {
                    const conditionRes = this.#handleConditionBranch(n.jp, inStates, returnStates);
                    outStates = conditionRes.mergedOut;
                    returnStates = conditionRes.mergedReturn;
                }
            })
        );

        return { inStates, outStates, returnStates };
    }

    #handleConditionBranch(ifJp: If, inStates: NullabilityState, finalStates: NullabilityState) {
        let thenOutStates = new Map(inStates);
        let elseOutStates = new Map(inStates);
        const condCode = ifJp.cond.originNode.code;
        const match = condCode.match(/(.*?)\s*(==|!=)\s*(.*)/);
        
        if (match) {
            const [, left, operator, right] = match;
            const $var = left.trim();
            const $rhs = right.trim();
        
            const $nullability = this.#resolveRhsStateFromCode(ifJp.cond,$rhs, inStates);
        
            if ($nullability !== Nullability.MAYBE_NULL) {
                const isEq = operator === "==";
                const oppositeNullability = $nullability === Nullability.NULL ? Nullability.NOT_NULL : Nullability.NULL;
                thenOutStates.set($var, isEq ? $nullability : oppositeNullability);       
                elseOutStates.set($var, isEq ? oppositeNullability : $nullability);
            }
        }
        const thenJp = ifJp.then;
        const elseJp = ifJp.else;

        const thenHasReturn = (thenJp.astChildren || []).find(n=> n instanceof ReturnStmt);
        let elseHasReturn ;


        // Process THEN block
        const thenNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
            .filter(cfgNode => thenJp.contains(cfgNode.jp));
        
        const thenNodeIds = new Set(thenNodes.map(n => n.id));
        this.nodes = this.nodes.filter(node => !thenNodeIds.has(node.id)); // Remove from main queue

       
        let currentFinal = new Map(finalStates);

        for (const node of thenNodes) {
            const res = this.#computeUse(node, thenOutStates, currentFinal);
            thenOutStates = res.outStates;
            currentFinal = res.returnStates;
        }

        // Process ELSE block (if exists)
       
        if (elseJp) {
            elseHasReturn = (elseJp.astChildren).find(n=> n instanceof ReturnStmt);
            const elseNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
                .filter(cfgNode => elseJp.contains(cfgNode.jp));

            const elseNodeIds = new Set(elseNodes.map(n => n.id));
            this.nodes = this.nodes.filter(node => !elseNodeIds.has(node.id)); // Remove from main queue

            for (const node of elseNodes) {
                const res = this.#computeUse(node, elseOutStates, currentFinal);
                elseOutStates = res.outStates;
                currentFinal = res.returnStates;
            }
        }

        const mergedOut = (thenHasReturn && elseHasReturn) ? new Map()
                        : thenHasReturn                    ? elseOutStates
                        : elseHasReturn                    ? thenOutStates
                        : this.#mergeStates(thenOutStates, elseOutStates);

        return {
            mergedOut, 
            mergedReturn: currentFinal
        };
    }

    #computeVarDec($jp: Expression, state: NullabilityState): Nullability {
        return this.#resolveRhsState($jp, state);
    }

    /**
     * Calculates the union (meet) of two dataflow states.
     * Returns a new Map representing the combined state.
     */
    #mergeStates(state1: NullabilityState, state2: NullabilityState): NullabilityState {
        const merged = new Map(state2);

        for (const [key, val1] of state1) {
            const val2 = state2.get(key);
            if (val2 !== undefined) {
                // If both states agree, keep it. If they conflict, fallback to MAYBE_NULL.
                merged.set(key, val1 === val2 ? val1 : Nullability.MAYBE_NULL);
            } else {
                merged.set(key, val1);
            }
        }

        return merged;
    }



    #resolveRhsState($jp: Joinpoint, state: NullabilityState): Nullability {
        const code: string = $jp.code;
        return this.#resolveRhsStateFromCode($jp,code, state);

    }

    #resolveRhsStateFromCode($jp:Joinpoint,code : string, state: NullabilityState): Nullability{
                // 1. Literal Nulls
        if (code.includes("NULL") || code.includes("= 0") || code.includes("(void *) 0")) {
            return Nullability.NULL;
        }

        // 2. Memory addresses (always not null)
        if (code.includes("&")) {
            return Nullability.NOT_NULL;
        }

        // 3. Direct variable check
        if (state.has(code)) {
            return state.get(code)!;
        }

        // 4. Direct pointer dereferences (e.g., *p)
        if (code.startsWith("*")) {
            const pointerVar = code.replace("*", "").trim();
            const pointerState = state.get(pointerVar) ?? Nullability.MAYBE_NULL;

            if (pointerState !== Nullability.NOT_NULL) {
                throw new NullDereferenceError($jp, code, pointerState);
            }

            return pointerState === Nullability.NOT_NULL ? Nullability.NOT_NULL : Nullability.MAYBE_NULL;
        }

        // 5. Assignments (e.g., x = *p or x = y)
        const parts = code.split("=");
        if (parts.length > 1) {
            let rhs = parts[1].replace(";", "").trim();

            if (rhs.startsWith("*")) {
                rhs = rhs.substring(1).trim();
                const pointerState = state.get(rhs) ?? Nullability.MAYBE_NULL;
                return pointerState === Nullability.NOT_NULL ? Nullability.NOT_NULL : Nullability.MAYBE_NULL;
            }

            return state.get(rhs) ?? Nullability.MAYBE_NULL;
        }

        return Nullability.MAYBE_NULL;

    }


}
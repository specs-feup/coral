import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import Node from "@specs-feup/flow/graph/Node";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ContractViolationError from "@specs-feup/coral/error/null_safety/ContractViolationError";
import { Call, ReturnStmt, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import NullDereferenceError from "@specs-feup/coral/error/null_safety/NullDereferenceError";
export type NullabilityState = Map<string, Nullability>;
import ControlFlowNode from "@specs-feup/flow/flow/ControlFlowNode";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Contract } from "@specs-feup/coral/symbol/Nullability";
import { 
    BinaryOp, Expression, If, Joinpoint, Loop, Scope, 
    TernaryOp, ParenExpr, MemberAccess, UnaryOp 
} from "@specs-feup/clava/api/Joinpoints.js";
import PreconditionViolationError from "@specs-feup/coral/error/null_safety/PreconditionViolationError";

type DataflowStates = {
    inStates: NullabilityState;
    outStates: NullabilityState;
    returnStates: NullabilityState;
};

export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodes: CoralCfgNode.Class[] = [];
    private currentState: NullabilityState = new Map();
    private aliasMap = new Map<string, string>();
    // Tracks temporary boolean variables back to the condition they represent
    private conditionDefs = new Map<string, { targetVar: string, isEq: boolean }>();
    private processNodes = new Set<string>;

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
        this.aliasMap.clear();
        this.conditionDefs.clear();

        for (const param of fnSymbol.params) {
            const initial = param.initialNullability ?? Nullability.MAYBE_NULL;
            this.currentState.set(param.jp.name, initial);
            inStates.set(param.jp.name, initial);
        }

        for (const node of this.fn.controlFlowNodes.filterIs(ControlFlowNode)) {
            if (node.is(ControlFlowEndNode)) {
                // TODO Hack to make ControlFlowEndNode a CoralCfgNode
                // this is against the philosophy of flow, but requires
                // a refactor of coral to fix
                node.init(new ClavaControlFlowNode.Builder(this.fn.jp));
            }
            if (!node.is(ClavaControlFlowNode)) {
                continue;
            }
            node.init(new CoralCfgNode.Builder()).as(CoralCfgNode);
        }
        const uniqueNodesMap = new Map<string, CoralCfgNode.Class>();

        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {
            if (node.jp?.astId) {
                uniqueNodesMap.set(node.jp.astId, node);
            }
        }

        this.nodes = [...uniqueNodesMap.values()];



        // 2. Traverse the CFG
        while (this.nodes.length > 0) {
            const node = this.nodes.shift()!;
            console.log("node, ", node.jp.code)
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

        let outStates = new Map(inStates);
        let returnStates = new Map(finalStates);

        if (this.processNodes.has(node.jp.astId)) {
            return { inStates, outStates, returnStates };
        }

        this.#verifyDereferences(node.jp, outStates);

        node.switch(
            Node.Case(VariableDeclarationNode, n => {
                console.log("var dec")
                if (n.jp.hasInit) {
                    node.addDef(n.jp);

                    // NEW: Track the definition behind the scenes
                    this.#trackDefinition(n.jp, inStates, n.jp.name, n.jp.init!);

                    const v = this.#computeVarDec(n.jp.init!, outStates);
                    outStates.set(n.jp.name, v);
                }
                else{
                    outStates.set(n.jp.name, Nullability.NULL);
                }
            }),

            Node.Case(ExpressionNode, n => {
                if (n.jp instanceof BinaryOp) {
                    if (n.jp.isAssignment) {
                        this.#trackDefinition(n.jp, inStates, n.jp.left.code.trim(), n.jp.right);
                    }

                
                    
                    const rightState = this.#resolveRhsState(n.jp.right, outStates);
                    outStates.set(n.jp.left.code.trim(), rightState);
                }
                if (n.jp instanceof Call) {
                    // 1. Get the AST node of the function being called
                    const callee = n.jp.function;
                    
                    if (callee) {
                        // 2. Retrieve the raw contracts attached to this function
                        const raw = callee.getUserField("coralContracts") as unknown as string | undefined;
                        let contracts : Contract[] = [];
                        if (raw) {
                            contracts = JSON.parse(raw) as Contract[];
                            console.log("contracts, ", contracts)
                        }
                            // 3. Match the function's parameters to the arguments passed in the call
                            const args = n.jp.args;
                            const params = callee.params;

                            console.log("Args, ", args[0].code);
                            console.log("params, ", params[0].name);


                            for (let i = 0; i < args.length && i < params.length; i++) {
                                const paramName = params[i].name;
                                
                                const paramContract = contracts.find(c => c.target.trim() === paramName.trim());
                                if (paramContract && paramContract.entryState) {
                                    const argNullability = inStates.get(args[i].code)
                                    const paramNullability = paramContract.entryState
                                    if(paramNullability !== Nullability.MAYBE_NULL && paramNullability!== argNullability){
                                        throw new PreconditionViolationError(n.jp, args[i].code, callee.name, paramNullability as string, argNullability as string);
                                    }
                                }

                                const argCode = args[i].code.replace(/[()]/g, "").trim();
                                const rootVar = this.aliasMap.get(argCode) || argCode;
                                outStates.set(rootVar,(paramContract && paramContract.exitState)? paramContract.exitState: Nullability.MAYBE_NULL);
                            }
                }
            }
        }),

            Node.Case(ReturnNode, n => {
                returnStates = this.#mergeStates(outStates, returnStates);
            }),

            Node.Case(ConditionNode, n => {
                if (n.jp instanceof If || n.jp instanceof Loop) {
                    console.log("If statement", n.condition.code);
                    const conditionRes = this.#handleConditionBranch(n.jp, inStates, returnStates);
                    outStates = conditionRes.mergedOut;
                    returnStates = conditionRes.mergedReturn;
                }
            }),

        );
        this.processNodes.add(node.jp.astId);
        console.log(outStates)
        return { inStates, outStates, returnStates };
    }

    testDeferencialError(jp: Joinpoint, code: string, outStates: NullabilityState) {
        const pointerVar = code.replace("*", "").trim();
        const pointerState = outStates.get(pointerVar) ?? Nullability.MAYBE_NULL;

        if (pointerState !== Nullability.NOT_NULL) {
            throw new NullDereferenceError(jp, code, pointerState);
        }

        return pointerState === Nullability.NOT_NULL ? Nullability.NOT_NULL : Nullability.MAYBE_NULL;
    }



    #handleConditionBranch(ifJp: If | Loop, inStates: NullabilityState, finalStates: NullabilityState) {
        // TODO: this logic only makes sense if var is maybe-null
        let thenOutStates = new Map(inStates);
        let elseOutStates = new Map(inStates);

        const condCode = ifJp.cond.code.replace(/[();]/g, "").trim();

        console.log("cond code, ", condCode)
        console.log("condition defs, ", this.conditionDefs);

        let targetVar = "";
        let isEq = false;

        if (this.conditionDefs.has(condCode)) {
            const def = this.conditionDefs.get(condCode)!;
            targetVar = def.targetVar;
            isEq = def.isEq;
        }
        else {
            let varToCheck = condCode;
            if (condCode.startsWith("!")) {
                varToCheck = condCode.substring(1).trim();
                isEq = true;
            }
            targetVar = this.aliasMap.get(varToCheck) || varToCheck;
        }
        if (targetVar.startsWith("!")) {
            targetVar = targetVar.substring(1).trim();
            isEq = !isEq;
        }
        console.log("target var, ", targetVar);
        if (targetVar && targetVar !== "NULL") {
            thenOutStates.set(targetVar, isEq ? Nullability.NULL : Nullability.NOT_NULL);
            elseOutStates.set(targetVar, isEq ? Nullability.NOT_NULL : Nullability.NULL);
        }

        let thenJp;
        let elseJp;

        if (ifJp instanceof If) {
            thenJp = ifJp.then;
            elseJp = ifJp.else;
        } else if (ifJp instanceof Loop) {
            console.log("Loop body, ", ifJp.body.code)
            thenJp = ifJp.body
        } else {
            throw Error("Condition must be If or Loop");
        }

        const thenHasReturn = Query.searchFrom(thenJp, ReturnStmt).first() !== undefined;
        let elseHasReturn;


        // Process THEN block
        const thenNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
            .filter(cfgNode => thenJp.contains(cfgNode.jp));

        console.log(this.nodes)
        let currentFinal = new Map(finalStates);
        console.log(thenNodes)
        for (const node of thenNodes) {
            console.log("Hello?")
            const res = this.#computeUse(node, thenOutStates, currentFinal);
            thenOutStates = res.outStates;
            currentFinal = res.returnStates;
        }

        // Process ELSE block (if exists)

        if (elseJp) {
            console.log("else stms")
            elseHasReturn = Query.searchFrom(elseJp, ReturnStmt).first() !== undefined;
            const elseNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
                .filter(cfgNode => elseJp.contains(cfgNode.jp));


            for (const node of elseNodes) {
                const res = this.#computeUse(node, elseOutStates, currentFinal);
                elseOutStates = res.outStates;
                currentFinal = res.returnStates;
            }
        }
        console.log("then outs, ", thenOutStates)

        const mergedOut = (thenHasReturn && elseHasReturn) ? new Map()
            : thenHasReturn ? elseOutStates
                : elseHasReturn ? thenOutStates
                    : this.#mergeStates(thenOutStates, elseOutStates);
        console.log("merge states, ", mergedOut)
        return {
            mergedOut,
            mergedReturn: currentFinal
        };
    }

    #computeVarDec($jp: Expression, state: NullabilityState): Nullability {
        console.log(state)
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
        return this.#resolveRhsStateFromCode($jp, code, state);

    }

    #resolveRhsStateFromCode($jp: Joinpoint, code: string, state: NullabilityState): Nullability {
        // 1. Literal Nulls


        if (code.includes("NULL") || code.includes("= 0") || code.includes("(void *) 0")) {
            return Nullability.NULL;
        }
        code = code.replace(/[()]/g, "");

        if (code.startsWith("!")) {
            const res = this.#resolveRhsStateFromCode($jp, code.substring(1).trim(), state);
            return (res == Nullability.MAYBE_NULL) ? Nullability.MAYBE_NULL
                : res == Nullability.NOT_NULL ? Nullability.NULL
                    : Nullability.NOT_NULL;
        }

        if (state.get(code)) {
            return state.get(code) ?? Nullability.MAYBE_NULL;
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
            return state.get(code) ?? Nullability.MAYBE_NULL;
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

    #trackDefinition($jp: Joinpoint, states: NullabilityState, leftName: string, rightJp: Expression) {
        
        // 1. GUARD CLAUSE: Only track auxiliary compiler variables. 
        // Actual variables (like 'ptr') are mutable and are safely tracked in outStates!
        if (!leftName.startsWith("__coral_var_")) {
            return;
        }

        const rightCode = rightJp.code.trim();

        /*if (rightCode.includes("NULL") || rightCode === "0" || rightCode.includes("(void *) 0")) {
            this.aliasMap.set(leftName, "NULL");
            return;
        }*/

        // Peel parentheses
        let coreJp = rightJp;
        while (coreJp instanceof ParenExpr) {
            coreJp = coreJp.subExpr;
        }

        if (coreJp instanceof BinaryOp && (coreJp.operator === "==" || coreJp.operator === "!=")) {
            const leftOp = coreJp.left.code.replace(/[()]/g, "").trim();
            const rightOp = coreJp.right.code.replace(/[()]/g, "").trim();
            const resolvedLeft = this.aliasMap.get(leftOp) || leftOp;
            const resolvedRight = this.aliasMap.get(rightOp) || rightOp;

            const leftState = this.#resolveRhsStateFromCode($jp, resolvedLeft, states);
            const rightState = this.#resolveRhsStateFromCode($jp, resolvedRight, states);

            if (leftState === Nullability.NULL || rightState === Nullability.NULL) {
                const targetVar = rightState === Nullability.NULL ? resolvedLeft : resolvedRight;

                this.conditionDefs.set(leftName, {
                    targetVar: targetVar,
                    isEq: coreJp.operator === "=="
                });
            }
            return;
        }

        // 2. PARENTHESES FIX: Use the peeled 'coreJp' code so (__coral_var_0) resolves correctly
        const cleanRightCode = coreJp.code.replace(/[()]/g, "").trim();

        if (cleanRightCode.match(/^[!a-zA-Z_][a-zA-Z0-9_.\->\[\]]*$/)) {
            const rootVar = this.aliasMap.get(cleanRightCode) || cleanRightCode;
            this.aliasMap.set(leftName, rootVar);
        }
    }

    #verifyDereferences(jp: Joinpoint, outStates: NullabilityState) {
        // 1. Check struct arrow accesses (e.g., d->value)

        console.log("Deferences, ", jp.code)
        if (jp instanceof BinaryOp || jp instanceof Vardecl) {

            for (const ma of Query.searchFrom(jp, MemberAccess)){
            console.log("ola?, ", ma.arrow)
            if (ma.arrow) {

                // Extract the base variable (e.g., 'd' from 'd->value')
                const baseVar = ma.base.code.replace(/[()]/g, "").trim();
                const rootVar = this.aliasMap.get(baseVar) || baseVar;
                console.log(rootVar);
                console.log(outStates)
                const pointerState = outStates.get(rootVar) ?? Nullability.MAYBE_NULL;

                if (pointerState !== Nullability.NOT_NULL) {
                    throw new NullDereferenceError(jp, baseVar, pointerState);
                }
            }
        }
        for (const ma of Query.searchFrom(jp, UnaryOp)) {
            if (ma.operator === "*") {
                // Extract the operand (e.g., 'ptr' from '*ptr')
                const baseVar = ma.operand.code.replace(/[()]/g, "").trim();
                console.log(baseVar)
                console.log(this.aliasMap)
                const rootVar = this.aliasMap.get(baseVar) || baseVar;
                console.log(rootVar);
                const pointerState = outStates.get(rootVar) ?? Nullability.MAYBE_NULL;

                if (pointerState !== Nullability.NOT_NULL) {
                    throw new NullDereferenceError(ma, baseVar, pointerState);
                }
            }
        }
        }

        

        // 2. Check standard pointer dereferences (e.g., *ptr)

    }


}
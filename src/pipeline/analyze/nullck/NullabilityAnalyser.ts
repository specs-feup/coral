import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import Node from "@specs-feup/flow/graph/Node";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ContractViolationError from "@specs-feup/coral/error/null_safety/ContractViolationError";
import { Call, ReturnStmt, If, Loop, BinaryOp } from "@specs-feup/clava/api/Joinpoints.js";
import ControlFlowNode from "@specs-feup/flow/flow/ControlFlowNode";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Nullability } from "@specs-feup/coral/symbol/Nullability";

// Import our newly extracted classes
import { NullabilityEnvironment } from "./NullabilityEnvironment.js";
import { NullabilityChecker } from "./NullabilityChecker.js";

type DataflowEnvironments = {
    inEnv: NullabilityEnvironment;
    outEnv: NullabilityEnvironment;
    returnEnv: NullabilityEnvironment;
};

export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodes: CoralCfgNode.Class[] = [];
    private processNodes = new Set<string>();

    constructor(fn: CoralFunctionNode.Class) {
        this.fn = fn;
    }

    apply(): void {
        this.#computeDefsAndUses();
    }

    #computeDefsAndUses() {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);

        let inEnv = new NullabilityEnvironment();
        let finalEnv = new NullabilityEnvironment();

        // 1. Initialize Contracts
        for (const param of fnSymbol.params) {
            const initial = param.initialNullability ?? Nullability.MAYBE_NULL;
            inEnv.states.set(param.jp.name, initial);
        }

        // 2. Setup CFG Nodes
        for (const node of this.fn.controlFlowNodes.filterIs(ControlFlowNode)) {
            if (node.is(ControlFlowEndNode)) {
                node.init(new ClavaControlFlowNode.Builder(this.fn.jp));
            }
            if (!node.is(ClavaControlFlowNode)) continue;
            node.init(new CoralCfgNode.Builder()).as(CoralCfgNode);
        }
        
        const uniqueNodesMap = new Map<string, CoralCfgNode.Class>();
        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {
            if (node.jp?.astId) uniqueNodesMap.set(node.jp.astId, node);
        }
        this.nodes = [...uniqueNodesMap.values()];

        // 3. Traverse CFG
        while (this.nodes.length > 0) {
            const node = this.nodes.shift()!;
            const res = this.#computeUse(node, inEnv, finalEnv);
            inEnv = res.outEnv;
            finalEnv = res.returnEnv;
        }

        finalEnv = NullabilityEnvironment.merge(inEnv, finalEnv);

        // 4. Validate Final Constraints
        for (const param of fnSymbol.params) {
            const finalStateExpected = param.finalNullability ?? Nullability.MAYBE_NULL;
            const actualState = finalEnv.states.get(param.name) ?? Nullability.MAYBE_NULL;

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

    #computeUse(node: CoralCfgNode.Class, inEnv: NullabilityEnvironment, finalEnv: NullabilityEnvironment): DataflowEnvironments {
        // Deep clone environments to avoid mutating earlier paths
        let outEnv = new NullabilityEnvironment(inEnv.states, inEnv.aliasMap, inEnv.conditionDefs);
        let returnEnv = new NullabilityEnvironment(finalEnv.states, finalEnv.aliasMap, finalEnv.conditionDefs);

        if (this.processNodes.has(node.jp.astId)) {
            return { inEnv, outEnv, returnEnv };
        }

        // --- CHECKER: Validate Safety ---
        NullabilityChecker.verifyDereferences(node.jp, outEnv);

        node.switch(
            Node.Case(VariableDeclarationNode, n => {
                if (n.jp.hasInit) {
                    node.addDef(n.jp);
                    outEnv.trackDefinition(n.jp, n.jp.name, n.jp.init!);
                    const state = outEnv.resolveRhsStateFromCode(n.jp.init!, n.jp.init!.code);
                    outEnv.states.set(n.jp.name, state);
                } else {
                    outEnv.states.set(n.jp.name, Nullability.NULL);
                }
            }),

            Node.Case(ExpressionNode, n => {
                if (n.jp instanceof BinaryOp) {
                    if (n.jp.isAssignment) {
                        outEnv.trackDefinition(n.jp, n.jp.left.code.trim(), n.jp.right);
                    }
                    const rightState = outEnv.resolveRhsStateFromCode(n.jp.right, n.jp.right.code);
                    const cleanLhs = outEnv.resolveAlias(n.jp.left.code.replace(/[()]/g, "").trim());
                    outEnv.states.set(cleanLhs, rightState);
                }
                
                if (n.jp instanceof Call) {
                    // --- CHECKER: Handle Function calls ---
                    NullabilityChecker.applyFunctionContracts(n.jp, outEnv);
                }
            }),

            Node.Case(ReturnNode, n => {
                returnEnv = NullabilityEnvironment.merge(outEnv, returnEnv);
            }),

            Node.Case(ConditionNode, n => {
                if (n.jp instanceof If || n.jp instanceof Loop) {
                    const conditionRes = this.#handleConditionBranch(n.jp, outEnv, returnEnv);
                    outEnv = conditionRes.mergedOut;
                    returnEnv = conditionRes.mergedReturn;
                }
            }),
        );
        this.processNodes.add(node.jp.astId);
        return { inEnv, outEnv, returnEnv };
    }

    #handleConditionBranch(ifJp: If | Loop, inEnv: NullabilityEnvironment, finalEnv: NullabilityEnvironment) {
        let thenOutEnv = new NullabilityEnvironment(inEnv.states, inEnv.aliasMap, inEnv.conditionDefs);
        let elseOutEnv = new NullabilityEnvironment(inEnv.states, inEnv.aliasMap, inEnv.conditionDefs);

        const condCode = ifJp.cond.code.replace(/[();]/g, "").trim();

        let targetVar = "";
        let isEq = false;

        if (inEnv.conditionDefs.has(condCode)) {
            const def = inEnv.conditionDefs.get(condCode)!;
            targetVar = def.targetVar;
            isEq = def.isEq;
        } else {
            let varToCheck = condCode;
            if (condCode.startsWith("!")) {
                varToCheck = condCode.substring(1).trim();
                isEq = true;
            }
            targetVar = inEnv.resolveAlias(varToCheck);
        }
        
        if (targetVar.startsWith("!")) {
            targetVar = targetVar.substring(1).trim();
            isEq = !isEq;
        }

        if (targetVar && targetVar !== "NULL") {
            thenOutEnv.states.set(targetVar, isEq ? Nullability.NULL : Nullability.NOT_NULL);
            elseOutEnv.states.set(targetVar, isEq ? Nullability.NOT_NULL : Nullability.NULL);
        }

        let thenJp;
        let elseJp;

        if (ifJp instanceof If) {
            thenJp = ifJp.then;
            elseJp = ifJp.else;
        } else if (ifJp instanceof Loop) {
            thenJp = ifJp.body;
        } else {
            throw Error("Condition must be If or Loop");
        }

        const thenHasReturn = Query.searchFrom(thenJp, ReturnStmt).first() !== undefined;
        let elseHasReturn;

        const thenNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
            .filter(cfgNode => thenJp.contains(cfgNode.jp));

        let currentReturnEnv = new NullabilityEnvironment(finalEnv.states, finalEnv.aliasMap, finalEnv.conditionDefs);
        for (const node of thenNodes) {
            const res = this.#computeUse(node, thenOutEnv, currentReturnEnv);
            thenOutEnv = res.outEnv;
            currentReturnEnv = res.returnEnv;
        }

        if (elseJp) {
            elseHasReturn = Query.searchFrom(elseJp, ReturnStmt).first() !== undefined;
            const elseNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
                .filter(cfgNode => elseJp.contains(cfgNode.jp));

            for (const node of elseNodes) {
                const res = this.#computeUse(node, elseOutEnv, currentReturnEnv);
                elseOutEnv = res.outEnv;
                currentReturnEnv = res.returnEnv;
            }
        }

        const mergedOut = (thenHasReturn && elseHasReturn) ? new NullabilityEnvironment()
            : thenHasReturn ? elseOutEnv
                : elseHasReturn ? thenOutEnv
                    : NullabilityEnvironment.merge(thenOutEnv, elseOutEnv);
                    
        return { mergedOut, mergedReturn: currentReturnEnv };
    }
}
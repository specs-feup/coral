import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import Node from "@specs-feup/flow/graph/Node";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ContractViolationError from "@specs-feup/coral/error/null_safety/ContractViolationError";
import { Call, ReturnStmt, If, Loop, BinaryOp, Break , Varref} from "@specs-feup/clava/api/Joinpoints.js";
import ControlFlowNode from "@specs-feup/flow/flow/ControlFlowNode";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Nullability, Contract } from "@specs-feup/coral/symbol/Nullability";
import { DereferenceRecord } from "./NullabilityChecker.js";
import { NullabilityEnvironment } from "./NullabilityEnvironment.js";
import { NullabilityChecker } from "./NullabilityChecker.js";
import NullDereferenceError from "@specs-feup/coral/error/null_safety/NullDereferenceError";
import PotentialNullDereferenceError from "@specs-feup/coral/error/null_safety/PotentialNullDereferenceError";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";


type DataflowEnvironments = {
    inEnv: NullabilityEnvironment;
    outEnv: NullabilityEnvironment;
    returnEnv: NullabilityEnvironment;
};

export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodes: CoralCfgNode.Class[] = [];
    private processNodes = new Set<string>();
    private dereferences = new Map<string, DereferenceRecord>();
    private breaksStates = new Map<string, NullabilityEnvironment>();
    private globalVars = new Set<string>();
    private hasChanged = new Set<string>();

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

        for (const vref of Query.searchFrom(this.fn.jp, Varref).get()) {
            if (vref.vardecl && vref.vardecl.isGlobal) {
                this.globalVars.add(vref.name); 
            }
        }


        for (const param of fnSymbol.params) {
            const initial = param.initialNullability ?? Nullability.MAYBE_NULL;
            inEnv.store.set(param.jp.name, { kind: "state", value: initial });
        }

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

        while (this.nodes.length > 0) {
            const node = this.nodes.shift()!;
            const res = this.#computeUse(node, inEnv, finalEnv);
            inEnv = res.outEnv;
            finalEnv = res.returnEnv;
        }

        finalEnv = NullabilityEnvironment.merge(inEnv, finalEnv);

        for (const record of this.dereferences.values()) {
            if (record.state === Nullability.NULL) {
                throw new NullDereferenceError(record.jp, record.varName, record.state);
            } else if (record.state === Nullability.MAYBE_NULL) {
                throw new PotentialNullDereferenceError(record.jp, record.varName);
            }
        }

        for (const param of fnSymbol.params) {

            if(param.isReadOnly){
                if(this.hasChanged.has(param.name)){
                    throw new ContractViolationError(
                        this.fn.jp, 
                        param.name, 
                        "unchanged" as Nullability
                    );
                }
            }
            const finalStateExpected = param.finalNullability ?? Nullability.MAYBE_NULL;
            const actualState = finalEnv.getState(param.name);

            if (finalStateExpected !== Nullability.MAYBE_NULL && actualState !== finalStateExpected) {
                throw new ContractViolationError(
                    param.jp.originNode,
                    param.name,
                    param.finalNullability!,
                    actualState
                );
            }
        }

        const rawContracts = this.fn.jp.getUserField("coralContracts") as unknown as string | undefined;
        if (rawContracts) {
            const contracts = JSON.parse(rawContracts) as Contract[];
            for (const contract of contracts) {
                
                if (contract.isGlobal) {
                    const actualState = finalEnv.getState(contract.target);
                    
                    if (contract.exitState !== undefined && actualState !== contract.exitState) {
                        throw new ContractViolationError(
                            this.fn.jp, 
                            contract.target, 
                            contract.exitState, 
                            actualState
                        );
                    }
                    
                    if (contract.unchanged) {
                        if (this.hasChanged.has(contract.target)) {
                             throw new ContractViolationError(
                                this.fn.jp, 
                                contract.target, 
                                "unchanged" as Nullability
                            );
                        }
                    }
                }
                
            }
        }
    } // End of #computeDefsAndUses

    #computeUse(node: CoralCfgNode.Class, inEnv: NullabilityEnvironment, finalEnv: NullabilityEnvironment): DataflowEnvironments {
        let outEnv = new NullabilityEnvironment(inEnv.store, inEnv.aliasMap);
        let returnEnv = new NullabilityEnvironment(finalEnv.store, finalEnv.aliasMap);

        if (this.processNodes.has(node.jp.astId)) {
            return { inEnv, outEnv, returnEnv };
        }

        NullabilityChecker.verifyDereferences(node.jp, outEnv, this.dereferences);

        if (node.jp instanceof Break) {
            const loopId = node.jp.enclosingStmt.astId;
            if (this.breaksStates.has(loopId)) {
                this.breaksStates.set(loopId, NullabilityEnvironment.merge(outEnv, this.breaksStates.get(loopId)!));
            } else {
                this.breaksStates.set(loopId, outEnv);
            }
        }

        node.switch(
            Node.Case(VariableDeclarationNode, n => {
                if (n.jp.hasInit) {
                    node.addDef(n.jp);
                    outEnv.trackDefinition(n.jp, n.jp.name, n.jp.init!);

                    const val = outEnv.resolveRhsValue(n.jp.init!, n.jp.init!.code);
                    outEnv.store.set(n.jp.name, val);
                } else {
                    outEnv.store.set(n.jp.name, { kind: "state", value: Nullability.NULL });
                }
            }),

            Node.Case(ExpressionNode, n => {
                if (n.jp instanceof BinaryOp) {
                    if (n.jp.isAssignment) {
                        outEnv.trackDefinition(n.jp, n.jp.left.code.trim(), n.jp.right);
                    }
                    const rightVal = outEnv.resolveRhsValue(n.jp.right, n.jp.right.code);
                    const cleanLhs = outEnv.resolveAlias(n.jp.left.code.replace(/[()]/g, "").trim());
                    outEnv.store.set(cleanLhs, rightVal);
                    if (n.jp.isAssignment) {
                        this.hasChanged.add(cleanLhs);
                    }
                }

                if (n.jp instanceof Call) {
                    NullabilityChecker.applyFunctionContracts(n.jp, outEnv, this.globalVars);
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
        let thenOutEnv = new NullabilityEnvironment(inEnv.store, inEnv.aliasMap);
        let elseOutEnv = new NullabilityEnvironment(inEnv.store, inEnv.aliasMap);
        console.log(thenOutEnv)
        const condCode = ifJp.cond.code.replace(/[();]/g, "").trim();

        let targetVar = "";
        let isEq = false;
        let isGuaranted = false;

        if (condCode === "1" || condCode === "true" || condCode === "while(1)") {
            isGuaranted = true;
        }

        const condVal = inEnv.store.get(condCode);

        if (condVal && condVal.kind === "condition") {
            targetVar = condVal.targetVar;
            isEq = condVal.isEq;
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
            let rootTarget = targetVar;
            let val = inEnv.store.get(rootTarget);
            while (val && val.kind === "pointer") {
                rootTarget = val.pointsTo;
                val = inEnv.store.get(rootTarget);
            }

            thenOutEnv.store.set(rootTarget, { kind: "state", value: isEq ? Nullability.NULL : Nullability.NOT_NULL });
            elseOutEnv.store.set(rootTarget, { kind: "state", value: isEq ? Nullability.NOT_NULL : Nullability.NULL });
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


        if (ifJp instanceof Loop) {
            const thenNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
                .filter(cfgNode => thenJp.contains(cfgNode.jp));

            let currentReturnEnv = new NullabilityEnvironment(finalEnv.store, finalEnv.aliasMap);
            for (const node of thenNodes) {
                const res = this.#computeUse(node, thenOutEnv, currentReturnEnv);
                thenOutEnv = res.outEnv;
                currentReturnEnv = res.returnEnv;
            }

            let mergedOut: NullabilityEnvironment;
            const breakEnv = this.breaksStates.get(ifJp.astId);

            console.log("breakEnv, ", breakEnv)

            if (isGuaranted) {
                mergedOut = breakEnv ? breakEnv : new NullabilityEnvironment();
            } else {
                mergedOut = breakEnv ? NullabilityEnvironment.merge(elseOutEnv, breakEnv) : elseOutEnv;
            }
            console.log("Merged out while", mergedOut)
            return { mergedOut, mergedReturn: currentReturnEnv };
        }

        const thenStops = this.#doesBranchStop(thenJp);
        let elseStops = false;

        const thenNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
            .filter(cfgNode => thenJp.contains(cfgNode.jp));

        let currentReturnEnv = new NullabilityEnvironment(finalEnv.store, finalEnv.aliasMap);
        for (const node of thenNodes) {
            const res = this.#computeUse(node, thenOutEnv, currentReturnEnv);
            thenOutEnv = res.outEnv;
            currentReturnEnv = res.returnEnv;
        }


        if (elseJp && !isGuaranted) {
            elseStops = this.#doesBranchStop(elseJp);

            const elseNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
                .filter(cfgNode => elseJp.contains(cfgNode.jp));

            for (const node of elseNodes) {
                const res = this.#computeUse(node, elseOutEnv, currentReturnEnv);
                elseOutEnv = res.outEnv;
                currentReturnEnv = res.returnEnv;
            }
        }

        const mergedOut = isGuaranted 
        ? (thenStops ? new NullabilityEnvironment() : thenOutEnv)
        : (thenStops && elseStops) ? new NullabilityEnvironment()
            : thenStops ? elseOutEnv 
                : elseStops ? thenOutEnv 
                    : NullabilityEnvironment.merge(thenOutEnv, elseOutEnv);
                    
        return { mergedOut, mergedReturn: currentReturnEnv };
    }

 
    #hasBreak(jp: Joinpoint | undefined): boolean {
        if (!jp) return false;
        return Query.searchFrom(jp, Break).first() !== undefined;
    }


    #doesBranchStop(jp: Joinpoint): boolean {
       
        if (Query.searchFrom(jp, ReturnStmt).first() !== undefined) {
            return true;
        }
        if (this.#hasBreak(jp)) {
            return true;
        }


        for (const call of Query.searchFrom(jp, Call)) {
            const name = call.function?.name || call.name;
            if (name === "__assert_fail" || name === "abort" || name === "exit" || name === "_exit") {
                return true;
            }
        }

        return false;
    }
}
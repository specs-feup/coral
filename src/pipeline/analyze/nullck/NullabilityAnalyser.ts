import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import Node from "@specs-feup/flow/graph/Node";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ContractViolationError from "@specs-feup/coral/error/null_safety/ContractViolationError";
import { Call, BinaryOp, Varref, If, Loop, Scope, Vardecl, Field, MemberAccess } from "@specs-feup/clava/api/Joinpoints.js";
import ControlFlowNode from "@specs-feup/flow/flow/ControlFlowNode";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Nullability, Contract } from "@specs-feup/coral/symbol/Nullability";
import { DereferenceRecord, NullabilityChecker } from "./NullabilityChecker.js";
import { NullabilityEnvironment } from "./NullabilityEnvironment.js";
import NullDereferenceError from "@specs-feup/coral/error/null_safety/NullDereferenceError";
import PotentialNullDereferenceError from "@specs-feup/coral/error/null_safety/PotentialNullDereferenceError";
import GotoLabelNode from "@specs-feup/clava-flow/cfg/node/GotoLabelNode";
import GotoNode from "@specs-feup/clava-flow/cfg/node/GotoNode";

import ScopeNode from "@specs-feup/clava-flow/cfg/node/ScopeNode";

type NodeState = {
    inEnv: NullabilityEnvironment;
    outEnv: NullabilityEnvironment;
};

export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodes: CoralCfgNode.Class[] = [];
    private store = new Map<string, NodeState>();
    private dereferences = new Map<string, DereferenceRecord>();
    private globalVars = new Set<string>();
    private hasChanged = new Set<string>();
    private isLabel = new Set<string>();
    private processedNodes = new Set<string>();
    private initialEnv: NullabilityEnvironment = new NullabilityEnvironment();


    constructor(fn: CoralFunctionNode.Class) {
        this.fn = fn;
    }

    apply(): void {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);
        this.#computeDefsAndUses(fnSymbol);
    }

    #computeDefsAndUses(fnSymbol: FnSymbol) {

        for (const vref of Query.searchFrom(this.fn.jp, Varref).get()) {
            if (vref.vardecl && vref.vardecl.isGlobal) {
                this.globalVars.add(vref.name);
                this.initialEnv.storeVar(vref);
                this.initialEnv.setNullability(vref.name, Nullability.MAYBE_NULL);

            }
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

        if (this.nodes.length === 0) return;



        for (const param of fnSymbol.params) {

            const initial = param.initialNullability ?? Nullability.MAYBE_NULL;
            this.initialEnv.storeVar(param.jp);
            this.initialEnv.setNullability(param.jp.name, initial);
            if (param.fieldsNullability !== undefined) {
                for (const [field, fieldNullabilityState] of Object.entries(param.fieldsNullability)) {

                    if (this.initialEnv.store.has(field)) {
                        this.initialEnv.setNullability(field, fieldNullabilityState.initialNullability ?? Nullability.MAYBE_NULL)
                    } else {
                        const paramState = this.initialEnv.store.get(param.jp.name)
                        if (paramState?.kind === "pointer") {
                            const object = this.initialEnv.store.get("*" + param.jp.name)!;
                            if (object.kind === "object") {
                                object.fields.add(field)
                                this.initialEnv.store.set("*" + param.jp.name, object)
                            }
                        } else if (paramState?.kind === "object") {
                            paramState.fields.add(field)
                            this.initialEnv.store.set("*" + param.jp.name, paramState)
                        }

                        this.initialEnv.store.set((param.jp.name + '.' + field), { kind: "pointer", pointsTo: new Set(["*" + (param.jp.name + '.' + field)]), exists: true, state: fieldNullabilityState.initialNullability ?? Nullability.MAYBE_NULL })

                    }
                }
            }
        }

        const entryNode = this.nodes.find(n =>
            n.jp.joinPointType !== "body" &&
            n.jp.joinPointType !== "function"
        );

        if (!entryNode) return;
        this.store.set(entryNode.id, { inEnv: this.initialEnv, outEnv: this.initialEnv });


        this.#computeFlow(entryNode);




        this.#validateResults();
    }


    #computeFlow(node: CoralCfgNode.Class) {



        let inEnv = this.store.has(node.id) ? this.store.get(node.id)!.inEnv : new NullabilityEnvironment();


        const incomers = node.incomers.filterIs(ControlFlowEdge).sources.filterIs(CoralCfgNode);

        for (const n of incomers) {

            if (n.jp instanceof If || n.jp instanceof Loop) {

                continue;
            }
            const predState = this.store.get(n.id);
            if (predState) {
                inEnv = NullabilityEnvironment.merge(inEnv, predState.outEnv);

            }

        }


        if (incomers.length === 0 && this.store.has(node.id)) {
            inEnv = this.store.get(node.id)!.inEnv;
        }


        let outEnv = this.#computeNode(node, new NullabilityEnvironment(inEnv.store, inEnv.aliasMap));



        const existingState = this.store.get(node.id);
        const hasBeenProcessed = this.processedNodes.has(node.id);
        if (hasBeenProcessed && existingState && this.#environmentsEqual(existingState.outEnv, outEnv)) {

            return;
        }




        this.processedNodes.add(node.id);

        this.store.set(node.id, { inEnv: inEnv, outEnv: outEnv });


        const outgoers = node.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);

        for (const out of outgoers) {
            this.#computeFlow(out);
        }
    }

    #computeNode(node: CoralCfgNode.Class, env: NullabilityEnvironment): NullabilityEnvironment {

        NullabilityChecker.verifyDereferences(node.jp, env, this.dereferences);

        node.switch(
            Node.Case(VariableDeclarationNode, n => {

                const varName = n.jp.name;
                env.storeVar(n.jp);

                if (n.jp.hasInit) {

                    env.trackDefinition(n.jp, varName, n.jp.init!);
                    const val = env.resolveRhsValue(env.store.get(varName)!, n.jp.init!, n.jp.init!.code)
                    env.store.set(varName, val);
                    if (n.jp.init instanceof Call) NullabilityChecker.applyFunctionContracts(n.jp.init, env, this.globalVars);
                } else {

                    const state = env.store.get(varName);
                    if (state?.kind === "pointer") {
                        env.setNullability(varName, Nullability.NULL)
                    }
                    else if (state?.kind === "var") {
                        env.store.set(varName, state);
                    }
                }
            }),

            Node.Case(ExpressionNode, n => {

                const coreJp = n.jp.joinPointType === "exprStmt" ? (n.jp as any).expr : n.jp;


                if (coreJp instanceof BinaryOp) {
                    if (coreJp.isAssignment) {
                        const lhs = coreJp.left.code.trim();

                        if (coreJp.left instanceof MemberAccess) {
                            if (coreJp.left.arrow) {

                                const object = env.store.get("*" + coreJp.left.base.code);
                                if (object?.kind === "object") object.fields.add(coreJp.left.name)
                            } else {
                                const object = env.store.get("*" + coreJp.left.base.code);
                                if (object?.kind === "object") object.fields.add(coreJp.left.name)
                            }
                        }
                        env.trackDefinition(coreJp, coreJp.left.code.trim(), coreJp.right);
                    }

                    const rawLhs = coreJp.left.code.replace(/[()]/g, "").trim();



                    let cleanLhs;

                    if (rawLhs.startsWith("*")) {

                        const ptrName = rawLhs.substring(1).trim();
                        cleanLhs = "*" + env.resolveAlias(ptrName);
                    } else {

                        cleanLhs = rawLhs;
                    }
                    const rightVal = env.resolveRhsValue(env.store.get(cleanLhs)!, coreJp.right, coreJp.right.code);

                    env.store.set(cleanLhs, rightVal);

                    if (coreJp.isAssignment) {
                        this.hasChanged.add(cleanLhs);
                    }
                }

                if (n.jp instanceof Call) {

                    NullabilityChecker.applyFunctionContracts(n.jp, env, this.globalVars);

                }
            }),

            Node.Case(ConditionNode, n => {
                const outgoers = node.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
                if (outgoers.length === 0) return;

                const jp = n.jp;
                if (jp instanceof If || jp instanceof Loop) {

                    const condStr = jp.cond.code.replace(/;/g, "").replace(/[()]/g, "").trim();

                    let targetVar: string | undefined = undefined;
                    let isEqToNull = false;


                    if (env.store.has(condStr) && env.store.get(condStr)!.kind === "condition") {
                        const condVal = env.store.get(condStr) as any;
                        targetVar = condVal.targetVar;
                        isEqToNull = condVal.isEqToNull;
                    }

                    else if (condStr.includes("==")) {
                        const parts = condStr.split("==").map(p => p.trim());
                        if (parts[1] === "NULL" || parts[1] === "0") {
                            targetVar = env.resolveAlias(parts[0]);
                            isEqToNull = true;
                        }
                    }

                    else if (condStr.includes("!=")) {
                        const parts = condStr.split("!=").map(p => p.trim());
                        if (parts[1] === "NULL" || parts[1] === "0") {
                            targetVar = env.resolveAlias(parts[0]);
                            isEqToNull = false;
                        }
                    }

                    else {
                        if (condStr.startsWith("!")) {
                            targetVar = env.resolveAlias(condStr.substring(1).trim());
                            isEqToNull = true;
                        } else {
                            targetVar = env.resolveAlias(condStr);
                            isEqToNull = false;
                        }
                    }


                    const applyNullabilityToAliases = (environment: NullabilityEnvironment, variable: string, nullability: Nullability) => {
                        environment.setNullability(variable, nullability);

                        const targetState = environment.store.get(variable);
                        if (targetState?.kind === "pointer" && targetState.pointsTo) {

                            for (const [key, val] of environment.store.entries()) {
                                if (key !== variable && val.kind === "pointer" && val.pointsTo) {
                                    const sharesTarget = [...val.pointsTo].some(pt => targetState.pointsTo!.has(pt));
                                    if (sharesTarget) {
                                        environment.setNullability(key, nullability);
                                    }
                                }
                            }
                        }
                    };


                    if (targetVar && targetVar !== "NULL" && env.store.has(targetVar)) {
                        const thenNullability = isEqToNull ? Nullability.NULL : Nullability.NOT_NULL;
                        const elseNullability = isEqToNull ? Nullability.NOT_NULL : Nullability.NULL;

                        let thenEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                        applyNullabilityToAliases(thenEnv, targetVar, thenNullability);
                        this.store.set(outgoers[0].id, { inEnv: thenEnv, outEnv: thenEnv });

                        if (outgoers.length > 1) {
                            let elseEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                            applyNullabilityToAliases(elseEnv, targetVar, elseNullability);
                            this.store.set(outgoers[1].id, { inEnv: elseEnv, outEnv: elseEnv });
                        }
                    } else {

                        let thenEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                        this.store.set(outgoers[0].id, { inEnv: thenEnv, outEnv: thenEnv });
                        if (outgoers.length > 1) {
                            let elseEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                            this.store.set(outgoers[1].id, { inEnv: elseEnv, outEnv: elseEnv });
                        }
                    }
                }
            }),



            Node.Case(GotoNode, n => {

                this.isLabel.add(n.id)
            }),


        );

        return env;
    }

    #validateResults() {

        const exitNodes = this.nodes.filter(n => n.outgoers.length === 0);

        let finalEnv = new NullabilityEnvironment();

        for (const exit of exitNodes) {
            const state = this.store.get(exit.id);

            if (state) {
                finalEnv = NullabilityEnvironment.merge(finalEnv, state.outEnv);


            }
        }



        for (const record of this.dereferences.values()) {
            if (record.state === Nullability.NULL) {
                throw new NullDereferenceError(record.jp, record.varName, record.state);
            } else if (record.state === Nullability.MAYBE_NULL) {
                throw new PotentialNullDereferenceError(record.jp, record.varName);
            }
        }


        const rawContracts = this.fn.jp.getUserField("coralContracts") as unknown as string | undefined;
        if (rawContracts) {
            const contracts = JSON.parse(rawContracts) as Contract[];
            for (const contract of contracts) {
                if (contract.target === "return" || contract.predicate) continue;

                const solve = finalEnv.resolveAlias(contract.target)

                const actualState = finalEnv.getState(solve);

                if (contract.exitState !== undefined && actualState !== undefined && actualState !== contract.exitState) {
                    throw new ContractViolationError(this.fn.jp, contract.target, contract.exitState, actualState);
                }

                if (contract.unchanged && this.hasChanged.has(contract.target)) {
                    throw new ContractViolationError(this.fn.jp, contract.target, "unchanged" as Nullability, actualState);
                }

                if (contract.fields !== undefined) {
                    for (const [field, fieldContract] of Object.entries(contract.fields)) {


                        if (finalEnv.store.has(field)) {
                            const fieldActualState = finalEnv.getState(field);

                            if (fieldContract.exitState !== undefined && fieldActualState !== undefined && fieldActualState !== contract.exitState) {
                                throw new ContractViolationError(this.fn.jp, field, fieldContract.exitState, fieldActualState);
                            }

                            if (fieldContract.unchanged && this.hasChanged.has(field)) {
                                throw new ContractViolationError(this.fn.jp, field, "unchanged" as Nullability, actualState);
                            }
                        } 
                    }
                }
            }
        }
    }


    #environmentsEqual(env1: NullabilityEnvironment, env2: NullabilityEnvironment): boolean {

        if (env1.store.size !== env2.store.size) return false;
        for (const [key, val1] of env1.store) {
            const val2 = env2.store.get(key);
            if (!val2) return false;
            if (JSON.stringify(val1) !== JSON.stringify(val2)) return false;
        }


        if (env1.aliasMap.size !== env2.aliasMap.size) return false;
        for (const [key, val1] of env1.aliasMap) {
            const val2 = env2.aliasMap.get(key);
            if (val1 !== val2) return false;
        }

        return true;
    }
}
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import Node from "@specs-feup/flow/graph/Node";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ContractViolationError from "@specs-feup/coral/error/null_safety/ContractViolationError";
import { Call, BinaryOp, Varref, If, Loop } from "@specs-feup/clava/api/Joinpoints.js";
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

type NodeState = {
    inEnv: NullabilityEnvironment;
    outEnv: NullabilityEnvironment;
};

export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodes: CoralCfgNode.Class[] = [];
    private store = new Map<string, NodeState>(); // Maps Node ID to its In/Out Environments
    private dereferences = new Map<string, DereferenceRecord>();
    private globalVars = new Set<string>();
    private hasChanged = new Set<string>();
    private isLabel = new Set<string>();
    private processedNodes = new Set<string>();

    constructor(fn: CoralFunctionNode.Class) {
        this.fn = fn;
    }

    apply(): void {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);
        this.#computeDefsAndUses(fnSymbol);
    }

    #computeDefsAndUses(fnSymbol: FnSymbol) {
        // 1. Identify Globals
        for (const vref of Query.searchFrom(this.fn.jp, Varref).get()) {
            if (vref.vardecl && vref.vardecl.isGlobal) {
                this.globalVars.add(vref.name); 
            }
        }

        // 2. Initialize CFG Nodes
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

        // 3. Setup Initial Environment with Parameters
        let initialEnv = new NullabilityEnvironment();
        for (const param of fnSymbol.params) {
            const initial = param.initialNullability ?? Nullability.MAYBE_NULL;
            initialEnv.store.set(param.jp.name, {kind: "state",value:initial});
        }
        ////console.log(initialEnv)

        // Apply the starting environment to the first node to kick off dataflow
       let nodes = [...this.nodes];
        while(nodes.length>0){
            const entryNode = nodes.shift()!;
            if(this.processedNodes.has(entryNode.id)) continue;
            this.store.set(entryNode.id, { inEnv: initialEnv, outEnv: initialEnv });

            // 4. Start Graph Traversal
            this.#computeFlow(entryNode);
        }

        // 5. Validation Phase (After Dataflow completes)
        this.#validateResults(fnSymbol);
    }

    // --- NEW: True Graph-based Fixed-Point Dataflow ---
    #computeFlow(node: CoralCfgNode.Class) {
        console.log(node.jp.code)
        
        if(this.store.has(node.id)){
            console.log("exists initial")
        }
        let inEnv = this.store.has(node.id)? this.store.get(node.id)!.inEnv: new NullabilityEnvironment();

        // 1. Merge all incoming edges
        const incomers = node.incomers.filterIs(ControlFlowEdge).sources.filterIs(CoralCfgNode);
        ////console.log(incomers.length)
        for (const n of incomers) {
                if(n.jp instanceof If || n.jp instanceof Loop ){
                    console.log("fodaasee")
                    continue;
                }
                const predState = this.store.get(n.id);
                ////console.log(predState)
                if (predState) {
                    inEnv = NullabilityEnvironment.merge(inEnv, predState.outEnv);
                    
            }
            
        }

        console.log("inENv",inEnv)

        // Ensure the entry node keeps its initial parameter bindings if it has no incomers
        if (incomers.length === 0 && this.store.has(node.id)) {
            inEnv = this.store.get(node.id)!.inEnv;
        }
    
        // 2. Compute the current node's effects
        let outEnv = this.#computeNode(node, new NullabilityEnvironment(inEnv.store, inEnv.aliasMap));

        // 3. Cycle Detection (Fixed-Point)
        // If the outEnv hasn't changed since the last time we visited this node, STOP propagating!
// 3. Cycle Detection (Fixed-Point)
// If the outEnv hasn't changed since the last time we visited this node, STOP propagating!
        const existingState = this.store.get(node.id);
        const hasBeenProcessed = this.processedNodes.has(node.id);
        if (hasBeenProcessed && existingState && this.#environmentsEqual(existingState.outEnv, outEnv)) {
            console.log("returning early")
            return; // State reached a fixed point, halt propagation on this path
        }



        // 4. Save state and propagate to all successors
        ////console.log("outEnv", outEnv)
        this.processedNodes.add(node.id);
        this.store.set(node.id, { inEnv: inEnv, outEnv: outEnv });
        
        const outgoers = node.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
        console.log(outgoers.length)
        for (const out of outgoers) {
            this.#computeFlow(out);
        }
    }

    #computeNode(node: CoralCfgNode.Class, env: NullabilityEnvironment): NullabilityEnvironment {
        // Track dereferences safely before executing the node
        NullabilityChecker.verifyDereferences(node.jp, env, this.dereferences);

        node.switch(
            Node.Case(VariableDeclarationNode, n => {
                //console.log("var dec b",env)
                const varName = n.jp.name;
                const isPointer = n.jp.type.joinPointType === "pointerType" || n.jp.type.code.includes("*");

                if (n.jp.hasInit) {
                    env.trackDefinition(n.jp, varName, n.jp.init!);
                    const val = env.resolveRhsValue(n.jp.init!, n.jp.init!.code);
                    env.store.set(varName, val);
                } else {
                    // Uninitialized logic based on Memory Model types
                    env.store.set(varName, {kind:"state",value: isPointer ? Nullability.NULL : Nullability.NOT_NULL});
                }

                //console.log("var dec end",env)
            }),

            Node.Case(ExpressionNode, n => {
                const coreJp = n.jp.joinPointType === "exprStmt" ? (n.jp as any).expr : n.jp;
                
                if (coreJp instanceof BinaryOp) {
                    if (coreJp.isAssignment) {
                        env.trackDefinition(coreJp, coreJp.left.code.trim(), coreJp.right);
                    }
                    
                    const rightVal = env.resolveRhsValue(coreJp.right, coreJp.right.code);
                    const rawLhs = coreJp.left.code.replace(/[()]/g, "").trim();
                    
                    let cleanLhs;
                    // Check if the assignment is a dereference (e.g., *target = 10;)
                    if (rawLhs.startsWith("*")) {
                        // We are modifying the memory ptr points to. We MUST resolve the alias.
                        const ptrName = rawLhs.substring(1).trim();
                        cleanLhs = env.resolveAlias(ptrName);
                    } else {
                        // We are directly modifying the variable itself (e.g., __coral_var_0 = __coral_var_2;)
                        // DO NOT resolve alias. Overwrite the variable directly!
                        cleanLhs = rawLhs;
                        
                        // Safety measure: since we are completely overwriting this variable, 
                        // if it had an old alias in the aliasMap, it's no longer valid.
                        // env.aliasMap.delete(cleanLhs); // (Uncomment if your logic requires clearing old aliases)
                    }
            
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
                console.log("outgoers,", outgoers.length)
                console.log(node.jp.code)
                outgoers.forEach(n=>console.log(n.jp.code))
                ////console.log(env)
                const jp = n.jp;
                if (jp instanceof If || jp instanceof Loop){
                    const cond = jp.cond.code.replace(";", "").trim();
                    console.log("condition,", cond)
                    if(env.store.has(cond)){
                        let condVal =  env.store.get(cond)!;
                        let targetVar;
                        let isEq;
                        if (condVal && condVal.kind === "condition") {
                            targetVar = condVal.targetVar;
                            isEq = condVal.isEq;
                        } else {
                            let varToCheck = cond;
                            if (cond.startsWith("!")) {
                                varToCheck = cond.substring(1).trim();
                                isEq = true;
                            }
                            targetVar = env.resolveAlias(varToCheck);
                        }
                
                        if (targetVar.startsWith("!")) {
                            targetVar = targetVar.substring(1).trim();
                            isEq = !isEq;
                        }
                
                        if (targetVar && targetVar !== "NULL") {
                            const ifNullanility = isEq ? Nullability.NULL : Nullability.NOT_NULL;
                            let thenEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                            thenEnv.store.set(targetVar , {kind:"state", value:ifNullanility})
                            const outgoers = node.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
                            this.store.set(outgoers[0].id, {inEnv: thenEnv, outEnv: thenEnv} );
                            const elseNullanility = isEq ? Nullability.NOT_NULL : Nullability.NULL;
                            env.store.set(targetVar , {kind:"state", value:elseNullanility})
                            let elseEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                            this.store.set(outgoers[1].id, {inEnv: elseEnv, outEnv: elseEnv} );
                        }
                    }
                    else{
                        let thenEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                        const outgoers = node.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
                        this.store.set(outgoers[0].id, {inEnv: thenEnv, outEnv: thenEnv} );
                        let elseEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                        this.store.set(outgoers[1].id, {inEnv: elseEnv, outEnv: elseEnv} );
                    }
                }

            }),

            Node.Case(GotoNode, n =>{
                //console.log("GOTO",node.jp.code)
                //console.log(env)
                this.isLabel.add(n.id)
            }),

            Node.Case(GotoLabelNode, n =>{
                //console.log("Label",node.jp.code)
                //console.log(env)
                
            }),
            
            Node.Case(ReturnNode, n => {
                // Do nothing to the state. The CFG naturally has no outgoers from here, 
                // so propagation will halt exactly as it should.
            })
        );

        return env;
    }

    #validateResults(fnSymbol: FnSymbol) {
        // Find the final exit nodes (usually ReturnNodes or the final block)
        const exitNodes = this.nodes.filter(n => n.outgoers.length === 0);
        let finalEnv = new NullabilityEnvironment();
        console.log("E,", exitNodes)
        for (const exit of exitNodes) {
            const state = this.store.get(exit.id);
            if (state) {
                finalEnv = NullabilityEnvironment.merge(finalEnv, state.outEnv);
                console.log(finalEnv)
               
            }
        }

        // 1. Verify Dereferences
        console.log(this.dereferences.values())
        for (const record of this.dereferences.values()) {
            if (record.state === Nullability.NULL) {
                throw new NullDereferenceError(record.jp, record.varName, record.state);
            } else if (record.state === Nullability.MAYBE_NULL) {
                throw new PotentialNullDereferenceError(record.jp, record.varName);
            }
        }

        // 2. Verify Post-Conditions (The unified loop we built earlier)
        const rawContracts = this.fn.jp.getUserField("coralContracts") as unknown as string | undefined;
        if (rawContracts) {
            const contracts = JSON.parse(rawContracts) as Contract[];
            for (const contract of contracts) {
                if (contract.target === "return" || contract.predicate) continue;
                const solve = finalEnv.resolveAlias(contract.target)
                console.log(solve);
                const actualState = finalEnv.getState(solve);
                
                if (contract.exitState !== undefined && actualState !== undefined && actualState !== contract.exitState) {
                    throw new ContractViolationError(this.fn.jp, contract.target, contract.exitState, actualState);
                }
                
                if (contract.unchanged && this.hasChanged.has(contract.target)) {
                    throw new ContractViolationError(this.fn.jp, contract.target, "unchanged" as Nullability, actualState);
                }
            }
        }
    }

    // Helper to prevent infinite loops in the CFG traversal
    #environmentsEqual(env1: NullabilityEnvironment, env2: NullabilityEnvironment): boolean {
        // 1. Check Store
        if (env1.store.size !== env2.store.size) return false;
        for (const [key, val1] of env1.store) {
            const val2 = env2.store.get(key);
            if (!val2) return false;
            if (JSON.stringify(val1) !== JSON.stringify(val2)) return false;
        }
    
        // 2. Check Alias Map
        if (env1.aliasMap.size !== env2.aliasMap.size) return false;
        for (const [key, val1] of env1.aliasMap) {
            const val2 = env2.aliasMap.get(key);
            if (val1 !== val2) return false;
        }
    
        return true;
    }
}
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
import { PointerNode } from "@specs-feup/coral/symbol/MemoryModel";
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
    private initialEnv : NullabilityEnvironment = new NullabilityEnvironment();

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
        }

        // //console.log(initialEnv)

       let nodes = [...this.nodes];
        while(nodes.length>0){
            const entryNode = nodes.shift()!;
            if(this.processedNodes.has(entryNode.id)) continue;
            this.store.set(entryNode.id, { inEnv: this.initialEnv, outEnv: this.initialEnv });


            this.#computeFlow(entryNode);
        }

    
        this.#validateResults();
    }


    #computeFlow(node: CoralCfgNode.Class) {
        console.log(node.jp.code)
        
        if(this.store.has(node.id)){
            // //console.log("exists initial")
        }
        let inEnv= this.store.has(node.id)? this.store.get(node.id)!.inEnv: new NullabilityEnvironment();
        console.log(inEnv);
     
        const incomers = node.incomers.filterIs(ControlFlowEdge).sources.filterIs(CoralCfgNode);
        //if(!this.store.has(node.id) && inEnv.store.size ===0 ) inEnv = new NullabilityEnvironment(this.initialEnv.store, this.initialEnv.aliasMap);
        console.log("incomers,", incomers.length)
        for (const n of incomers) {
                // //console.log(n.jp.code)
                if(n.jp instanceof If || n.jp instanceof Loop ){
                
                    continue;
                }
                const predState = this.store.get(n.id);
                //if(incomers.length>1)//console.log("pred state, ", predState?.outEnv.store)
                if (predState) {
                    inEnv = NullabilityEnvironment.merge(inEnv, predState.outEnv);
                    
            }
            
        }

       console.log("inEnv,", inEnv.store)
        if (incomers.length === 0 && this.store.has(node.id)) {
            inEnv = this.store.get(node.id)!.inEnv;
        }
    
 
        let outEnv = this.#computeNode(node, new NullabilityEnvironment(inEnv.store, inEnv.aliasMap));
        //console.log( "outenv,", outEnv.storeVar);


        const existingState = this.store.get(node.id);
        const hasBeenProcessed = this.processedNodes.has(node.id);
        if (hasBeenProcessed && existingState && this.#environmentsEqual(existingState.outEnv, outEnv)) {
            // //console.log("returning early")
            return; 
        }



 
        this.processedNodes.add(node.id);
        console.log(outEnv.store);
        this.store.set(node.id, { inEnv: inEnv, outEnv: outEnv });
        
        const outgoers = node.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
        // //console.log(outgoers.length)
        for (const out of outgoers) {
            this.#computeFlow(out);
        }
    }

    #computeNode(node: CoralCfgNode.Class, env: NullabilityEnvironment): NullabilityEnvironment {
        console.log("hahahahah", env)
        NullabilityChecker.verifyDereferences(node.jp, env, this.dereferences);

        node.switch(
            Node.Case(VariableDeclarationNode, n => {
           
                const varName = n.jp.name;
                env.storeVar(n.jp);

                if (n.jp.hasInit) {
                    
                    env.trackDefinition(n.jp, varName, n.jp.init!);
                    const val = env.resolveRhsValue(env.store.get(varName)!,n.jp.init!, n.jp.init!.code);
                    // //console.log("den den ", val)
             
                    env.store.set(varName, val);
                    // //console.log(env.store.get("__coral_var_0"))
                    // //console.log(env.store.get("ptr"))
                    // //console.log(env)
                } else {
              
                    const state = env.store.get(varName);
                    if(state?.kind=== "pointer"){
                        env.setNullability(varName, Nullability.NULL)
                    }
                    else if(state?.kind==="var"){
                        env.store.set(varName, state);
                    }
                }
            }),

            Node.Case(ExpressionNode, n => {

                const coreJp = n.jp.joinPointType === "exprStmt" ? (n.jp as any).expr : n.jp;
         
                
                if (coreJp instanceof BinaryOp) {
                    if (coreJp.isAssignment) {
                        const lhs =coreJp.left.code.trim();
                        //console.log("Opa, ", lhs)
                        if(coreJp.left instanceof MemberAccess){
                            if(coreJp.left.arrow){
                                console.log(coreJp.left.base.code, coreJp.left.name)
                                const object = env.store.get("*"+coreJp.left.base.code);
                                if(object?.kind === "object") object.fields.add(coreJp.left.name)
                            }else{
                                const object = env.store.get("*"+coreJp.left.base.code);
                                if(object?.kind === "object") object.fields.add(coreJp.left.name)
                            }
                        }
                        env.trackDefinition(coreJp, coreJp.left.code.trim(), coreJp.right);
                    }
                
                    const rawLhs = coreJp.left.code.replace(/[()]/g, "").trim();
                    
                   
                    
                    let cleanLhs;
             
                    if (rawLhs.startsWith("*")) {
                        
                        const ptrName = rawLhs.substring(1).trim();
                        cleanLhs = env.resolveAlias(ptrName);
                    } else {
                   
                        cleanLhs = rawLhs;
                    }
                    const rightVal = env.resolveRhsValue(env.store.get(cleanLhs)! , coreJp.right, coreJp.right.code);
               
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
                // //console.log(env)
        
                const jp = n.jp;
                if (jp instanceof If || jp instanceof Loop){
                    const cond = jp.cond.code.replace(";", "").trim();
                    // //console.log("condition,", cond)
                    if(env.store.has(cond) ){
                        let condVal =  env.store.get(cond)!;
                        let targetVar;
                        let isEq;
                        if (condVal && condVal.kind === "condition") {
                            targetVar = condVal.targetVar;
                            isEq = condVal.isEqToNull;
                        } else  {
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
                            thenEnv.setNullability(targetVar, ifNullanility)
                            //console.log(thenEnv)
                            const outgoers = node.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
                            this.store.set(outgoers[0].id, {inEnv: thenEnv, outEnv: thenEnv} );
                            const elseNullanility = isEq ? Nullability.NOT_NULL : Nullability.NULL;
                            env.setNullability(targetVar ,elseNullanility)
                            let elseEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                            this.store.set(outgoers[1].id, {inEnv: elseEnv, outEnv: elseEnv} );
                        }
                    }
                    else{
                        //console.log("condition")
                        
                        let thenEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                        
                        const outgoers = node.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
                        this.store.set(outgoers[0].id, {inEnv: thenEnv, outEnv: thenEnv} );
                        let elseEnv = new NullabilityEnvironment(env.store, env.aliasMap);
                        this.store.set(outgoers[1].id, {inEnv: elseEnv, outEnv: elseEnv} );
                    }
                }

            }),

            Node.Case(ScopeNode, n =>{
                /*
                if(this.varsDecInScope.has(n.jp.astId)){
                    // //console.log("Already exists");
                    // //console.log(n.jp.code);
                    // //console.log(this.varsDecInScope.get(n.jp.astId));
                    for( let $var of this.varsDecInScope.get(n.jp.astId)! ){
                        

                    }
                }
                else{
                    // //console.log("Creating")
                    let vars = new Set<string>()
                    for (const vdecl of Query.searchFrom(n.jp, Vardecl).get()) {
                        vars.add(vdecl.name);
                    }
                    this.varsDecInScope.set(n.jp.astId, vars);
                    
                }*/
                
            }),

            Node.Case(GotoNode, n =>{
 
                this.isLabel.add(n.id)
            }),

            Node.Case(GotoLabelNode, () =>{
              
       
                
            }),
            
            Node.Case(ReturnNode, () => {
          
            })
        );

        return env;
    }

    #validateResults() {
       
        const exitNodes = this.nodes.filter(n => n.outgoers.length === 0);
        let finalEnv = new NullabilityEnvironment();
        // //console.log("E,", exitNodes)
        for (const exit of exitNodes) {
            const state = this.store.get(exit.id);
            if (state) {
                finalEnv = NullabilityEnvironment.merge(finalEnv, state.outEnv);
                // //console.log(finalEnv)
               
            }
        }

      
        // //console.log(this.dereferences.values())
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
                // //console.log(solve);
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
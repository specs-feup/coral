import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import Node from "@specs-feup/flow/graph/Node";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ContractViolationError from "@specs-feup/coral/error/null_safety/ContractViolationError";
import { Call, ReturnStmt, If, Loop, BinaryOp, Break , Varref, Vardecl} from "@specs-feup/clava/api/Joinpoints.js";
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
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import Fn from "@specs-feup/coral/mir/symbol/Fn";
/*
type NodeEnvironments = {
    inEnv: NullabilityEnvironment;
    outEnv: NullabilityEnvironment;

};


export default class NullabilityModel {
    private fn: CoralFunctionNode.Class;
    private nodes: CoralCfgNode.Class[] = [];
    private processNodes = new Set<string>();
    private dereferences = new Map<string, DereferenceRecord>();
    private breaksStates = new Map<string, NullabilityEnvironment>();
    private globalVars = new Set<string>();
    private hasChanged = new Set<string>();
    private store = new Map<string, NodeEnvironments >()

    constructor(fn: CoralFunctionNode.Class) {
        this.fn = fn;
    }

    apply(): void {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);
        this.#computeDefsAndUses(fnSymbol);
    }

    #computeDefsAndUses(fnSymbol: FnSymbol) {
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

        let n =this.nodes.shift()!;
        n =this.nodes.shift()!;
        this.#computeFlow(n);
    }

    #computeFlow(node:CoralCfgNode.Class){
        let inEnv = new NullabilityEnvironment();
        const incomers = node.incomers.filterIs(ControlFlowEdge).sources.filterIs(CoralCfgNode);
        incomers.forEach((n)=> {
            console.log("ola?")
            if(this.store.has(n.id)){
                console.log("ola agian?", this.store.get(n.id)?.outEnv!);
                inEnv.merge(this.store.get(n.id)?.outEnv!)
            }
        })
        console.log("Node, ", node.jp.code);
        console.log("InENV, ", inEnv);
        let outEnv = this.#computeNode(node, new NullabilityEnvironment(inEnv.store) );
 
        console.log("OouENV, ", outEnv);
        this.store.set(node.id, {inEnv: inEnv, outEnv: outEnv});
        const out= node.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
        out.forEach((n)=> this.#computeFlow(n) );

    }

    #computeNode(node:CoralCfgNode.Class, states: NullabilityEnvironment): NullabilityEnvironment{

        node.switch(
            Node.Case(VariableDeclarationNode, n => {
                const varName = n.jp.name;
                const isPointer = n.jp.type.joinPointType === "pointerType" || n.jp.type.code.includes("*");
                const isStructer = n.jp.type.code.includes("struct");

                if (isPointer) {
                    // We might not know what it points to yet, but it's a pointer
                    
                    if (n.jp.hasInit){
                        
                        states.store.set(varName, { kind: "pointer", pointsTo: n.jp.init.code , isGlobal:false, state:this.resolveRhsValue(n.jp.init,states)});
                    }else{
                        states.store.set(varName, { kind: "pointer", pointsTo: "" , isGlobal:false, state: Nullability.NULL});
                    }
                } else if(isStructer){
                    // It is a stack object (int, struct)
                    
                }
                
            }),

            Node.Case(ExpressionNode, n => {
                // TODO: Intercept assignments (ptr = &myBox) and update PointerNode.pointsTo
                // TODO: Intercept field accesses (myBox.data) and add "data" to ObjectNode.fields
                // TODO: Intercept conditions (ptr == NULL) and create ConditionNodes
            })
                );
        
        return states
    }

    resolveRhsValue(jp:Joinpoint, states: NullabilityEnvironment):Nullability{
        const code = jp.code;
        console.log("code", jp.code)
        if(code==="NULL" || code ==="0" || code === "(void *) 0") return Nullability.NULL;
      
        if(states.store.has(code)){
            const $var = states.store.get(code);
            if($var!.kind === "pointer"){
                return $var!.state;
            }
        }

        if(code.startsWith("&")){
            return Nullability.NOT_NULL;
        }

        return Nullability.MAYBE_NULL;

    }
   
}
    */
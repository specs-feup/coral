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
import { Literal } from "@specs-feup/clava/api/Joinpoints.js";
import ContractViolationError from "@specs-feup/coral/error/null_safety/ContractViolationError";
export type NullabilityState = Map<string, Nullability>;

type inOut = {inStates: Map<string,Nullability>, outStates: Map<string,Nullability>, returnStates: Map<string,Nullability>}
export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodeStates: Map<string, NullabilityState> = new Map();
    // Tracks temporary variables back to their originals (e.g., __coral_var_0 -> p)
    private aliasMap: Map<string, string> = new Map();
    currentState: NullabilityState = new Map();
    constructor(fn: CoralFunctionNode.Class) {
        this.fn = fn;
    }

    private nodes: CoralCfgNode.Class[] = [];


        apply(): void {
            this.#computeDefsAndUses();
            // this.#computeLiveInOut();
        }
    
        #computeDefsAndUses() {
            const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);

            let inStates: NullabilityState = new Map();
            let outStates : NullabilityState = new Map();
            // let returnStates: NullabilityState[] = [];
           
            let finalStates:NullabilityState = new Map();
            this.aliasMap.clear();
            this.currentState.clear()
    
            // 1. Initialize State from Entry Contracts
            for (const param of fnSymbol.params) {
                const initial = param.initialNullability ?? Nullability.MAYBE_NULL;
                this.currentState.set(param.jp.name, initial);
                inStates.set(param.jp.name, initial);
            }
            this.nodes = [... this.fn.controlFlowNodes.expectAll(CoralCfgNode, "Nodes were previously inited as CoralCfgNode")]
            console.log(this.currentState);
            while (this.nodes.length > 0) {
                const node = this.nodes.shift()!; // Get the first node
                const res = this.#computeUse(node, inStates, finalStates);
                inStates = res.outStates;
                finalStates = res.returnStates;
                console.log("inStates,",inStates);
                console.log("outStates,", outStates);
                console.log("FinalStates,", finalStates);
            }

            finalStates= this.#solveConflict(inStates, finalStates);

            console.log(finalStates);
            for (const param of fnSymbol.params) {
                const final = param.finalNullability ?? Nullability.MAYBE_NULL;
                if (finalStates.get(param.name)!== final){
                    throw new ContractViolationError(
                        param.jp.originNode,
                        param.name,
                        param.finalNullability!,
                        finalStates.get(param.name)!,
                    )

                }
            }
        }

        #computeUse(node: CoralCfgNode.Class, inStates: Map<string, Nullability>, finalStates: Map<string, Nullability>): inOut{
            let outStates = inStates;
            node.switch(
                Node.Case(VariableDeclarationNode, n => {
                    console.log("------")
                    console.log("Var dec");
                    if (n.jp.hasInit) {
                        node.addDef(n.jp);
                        console.log(n.jp.name)
                        console.log(n.jp.code);
                        let v = this.#computeVarDec(node, n.jp.init!);
                        outStates.set(n.jp.name, v);
                    }
                }),
                Node.Case(ExpressionNode, n => {
                    console.log("----------------\n Expression node\n", n.jp)
                    console.log(n.jp.code);
                    if (n.jp instanceof BinaryOp){
                        console.log(n.jp.left)
                        console.log(n.jp.right)
                        outStates.set(n.jp.left.code, outStates.get(n.jp.right.code)!)
                    }
                }),
                Node.Case(ReturnNode, n => {
                    console.log("--------------");
                    console.log("Return");
                    console.log(n.jp.returnExpr);
                    console.log(n.jp.code);

                    finalStates= this.#solveConflict(outStates, finalStates);
                    console.log(finalStates)

                }),
                Node.Case(ConditionNode, n => {
                    console.log("---------")
                    console.log("Condition");
                    console.log(n.condition);
                    if (n.jp instanceof If){
                        const thenJp = n.jp.then;
                        const elseJp = n.jp.else;
                
                        // 1. Get all CFG nodes that belong inside the 'then' block
                        const thenNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
                            .filter(cfgNode =>  thenJp.contains(cfgNode.jp));
                
                        console.log("CFG Nodes in 'then' block:", thenNodes.map(tn => tn.jp.code));
                        const thenNodeIds = new Set(thenNodes.map(n => n.id));

                        console.log(this.nodes.length)
                        // Overwrite the main list with only the nodes NOT in the 'then' block
                        this.nodes = this.nodes.filter(node => !thenNodeIds.has(node.id));
                        console.log(this.nodes.length)

                        let thenInStates = new Map(inStates);
                        let elseInStates = new Map(inStates);
                        console.log("inStates, ", inStates)
                        for (const node of thenNodes){
                            const res = this.#computeUse(node, thenInStates, finalStates);
                            thenInStates = res.outStates;
                            //thenOutstates = res.outStates;
                            finalStates = res.returnStates;
                        }
                        console.log("Then inStates, ", thenInStates);
                        console.log("Else instates, ", elseInStates)
                        // 2. Get all CFG nodes that belong inside the 'else' block
                        if (elseJp) { 
                            const elseNodes = [...this.fn.controlFlowNodes.filterIs(CoralCfgNode)]
                                .filter(cfgNode => elseJp.contains(cfgNode.jp));

                                const elseNodeIds = new Set(elseNodes.map(n => n.id));
                                this.nodes = this.nodes.filter(node => !elseNodeIds.has(node.id));
                            
                            console.log("CFG Nodes in 'else' block:", elseNodes.map(en => en.jp.code));

                            for (const node of elseNodes){
                                const res = this.#computeUse(node, elseInStates, finalStates);
                                elseInStates = res.outStates;
                                //thenOutstates = res.outStates;
                                finalStates = res.returnStates;
                            }

                            console.log("else inStates, ", elseInStates);

                            outStates =this.#solveConflict(elseInStates,thenInStates)
                        }

                        console.log("Final instates, ", outStates);

                    }
                }),
            );
            return {inStates: inStates, outStates: outStates, returnStates: finalStates};

        }

    #computeVarDec(node: CoralCfgNode.Class, $jp: Expression ): Nullability{
        if ($jp instanceof Literal) {
            console.log ("Literal");
            node.nullabilityStates
        }
        console.log(node);
        console.log($jp.code);
        console.log(this.#resolveRhsState($jp, this.currentState));
        return this.#resolveRhsState($jp, this.currentState)
    }

    #solveConflict(currentState: Map<string, Nullability>, finalStates : Map<string, Nullability>){
        currentState.forEach((v:Nullability, k) => {
            if(finalStates.get(k)){
                let $temp: Nullability = finalStates.get(k)!;
                let $value: Nullability = Nullability.MAYBE_NULL;
                if( $temp === v){
                    $value = v;
                }
                finalStates.set(k, $value)
            }else{
                finalStates.set(k,v);
            }
        })

        return finalStates;

    }

    #resolveRhsState($jp: any, state: NullabilityState): Nullability {
        const code = $jp.code;
        
        console.log("RHS code , ", code )
        
        // 1. Literal Nulls
        if (code.includes("NULL") || code.includes("= 0") || code.includes("(void *) 0")) {
            return Nullability.NULL;
        }
        
        // 2. Memory addresses (always not null)
        if (code.includes("&")) {
            return Nullability.NOT_NULL;
        }

        if(this.currentState.get(code)){
            return this.currentState.get(code)!;
        }

        if(code.startsWith("*")){
            let $var = code.replace("*", "").trim();
            if(this.currentState.get($var)){
                return this.currentState.get($var)!;
            }
        }
        
        // 3. Variable Propagations & Dereferences
        const parts = code.split("=");
        if (parts.length > 1) {
            let rhs = parts[1].replace(";", "").trim();

            // Handle x = *p
            console.log("pointer, ", rhs)
            if (rhs.startsWith("*")) {
                console.log("pointer, ", rhs)
                rhs = rhs.substring(1).trim();
                const pointerState = state.get(rhs) ?? Nullability.MAYBE_NULL;
                return pointerState === Nullability.NOT_NULL ? Nullability.NOT_NULL : Nullability.MAYBE_NULL;
            }
            
            return state.get(rhs) ?? Nullability.MAYBE_NULL;
        }



        return Nullability.MAYBE_NULL;
    }


    }


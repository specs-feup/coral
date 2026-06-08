import { Nullability, Contract } from "@specs-feup/coral/symbol/Nullability";
import { Expression, Joinpoint, BinaryOp, ParenExpr, Call, Varref, Param } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
export type NullabilityVar = 
    | { kind: "state"; value: Nullability }
    | { kind: "pointer"; pointsTo: string }
    | { kind: "condition"; targetVar: string; isEq: boolean };

   

export type MemoryNode = PointerNode | ObjectNode | ConditionNode | VarNode | StateNode;

export interface PointerNode {
    kind: "pointer";
    contains?: string;
    state: Nullability;
}

export interface ObjectNode {
    kind: "object";
    fields: Set<string>;
}

export interface ConditionNode {
    kind: "condition";
    targetVar: string;
    isEqToNull: boolean; 
}

export interface VarNode {
    kind: "var";
    contains?: string;
    state: Nullability;
}

export interface StateNode {
    kind: "state";
    state: Nullability;
}

export class NullabilityEnvironment {
    public store: Map<string, MemoryNode>;
    public aliasMap: Map<string, string>;

    constructor(
        initialStore?: Map<string, MemoryNode>, 
        aliasMap?: Map<string, string>
    ) {
        this.store = new Map(initialStore);
        this.aliasMap = new Map(aliasMap);
    }

    static merge(env1: NullabilityEnvironment, env2: NullabilityEnvironment): NullabilityEnvironment {
        const mergedStore = new Map<string, MemoryNode>();

        const allKeys = new Set([...env1.store.keys(), ...env2.store.keys()]);

        for (const key of allKeys) {
            const val1 = env1.store.get(key);
            const val2 = env2.store.get(key);

            if (val1 !== undefined && val2 !== undefined) {
                // If they are structurally identical, keep them exactly as they are.
                if (JSON.stringify(val1) === JSON.stringify(val2)) {
                    mergedStore.set(key, val1);
                } 
                // --- THE FIX: Resolve underlying states on mismatch ---
                else {
                    if(val1.kind=== "pointer" && val2.kind=== "pointer"){
                        // They point to different things, or one is a state and one is a pointer.
                        // Ask the environment to resolve the final Nullability of both paths.
                        const state1 = env1.getState(key);
                        const state2 = env2.getState(key);

                        if (state1 === state2) {
                            // They resolved to the same safe state (e.g., both NOT_NULL)!
                            mergedStore.set(key, { kind: "pointer", state: state1, contains: val1.contains });
                        } else {
                            // They truly conflict (e.g., one is NULL, one is NOT_NULL)
                            mergedStore.set(key, { kind: "pointer", state: Nullability.MAYBE_NULL, contains: val1.contains });
                        }
                    }
                    else{
                        // TODO:
                    }
                }
            } 
            // If the variable only existed in one branch, pass it through
            else if (val1 !== undefined) {
                mergedStore.set(key, val1);
            } 
            else if (val2 !== undefined) {
                mergedStore.set(key, val2);
            }
        }

        // Safely merge the alias maps as well
        const mergedAliasMap = new Map([...env2.aliasMap, ...env1.aliasMap]);

        return new NullabilityEnvironment(mergedStore, mergedAliasMap);
    }

    getState(name: string): Nullability {
        const isNullLiteral = (str: string) => {
            return str === "NULL" || str === "0" || str.replace(/\s/g, "") === "(void*)0";
        };
        if(isNullLiteral(name)) return Nullability.NULL;
        const val = this.store.get(name);
        if (!val) return Nullability.MAYBE_NULL;
        
        if (val.kind === "pointer") return val.state;
        if (val.kind === "var") return this.getState(val.contains??"");
        
        return Nullability.MAYBE_NULL; 
    }

    resolveAlias(name: string): string {
        let stars = "";
        let coreName = name.trim();
        
        while (coreName.startsWith("*")) {
            stars += "*";
            coreName = coreName.substring(1).trim();
        }

        let resolved = this.aliasMap.get(coreName) || coreName;
        return stars + resolved;
    }

    resolveRhsValue($jp: Joinpoint, code: string): MemoryNode {
        console.log("---------------------------")
        let coreJp = $jp;
        while (coreJp instanceof ParenExpr) {
            coreJp = coreJp.subExpr;
        }

        if (coreJp instanceof Call) {
            const callee = coreJp.function;
            if (callee) {
                const raw = callee.getUserField("coralContracts") as unknown as string | undefined;
                if (raw) {
                    const contracts = JSON.parse(raw) as Contract[];
                    
                    // Look for a contract on the "return" value
                    const returnContract = contracts.find(c => c.target === "return");
                    
                    if (returnContract) {
                        // A. Is it a Predicate? (e.g., is_valid)
                        if (returnContract.predicate) {
                            const paramIndex = callee.params.findIndex(p => p.name === returnContract.predicate!.targetParam);
                            if (paramIndex !== -1 && paramIndex < coreJp.args.length) {
                                const argCode = coreJp.args[paramIndex].code.replace(/[()]/g, "").trim();
                                return {
                                    kind: "condition",
                                    targetVar: this.resolveAlias(argCode),
                                    isEqToNull: returnContract.predicate.isEq
                                };
                            }
                        }
                        
                        // --- NEW: B. Is it a standard State? (e.g., get_safe_pointer) ---
                        if (returnContract.exitState) {
                            return { kind: "pointer", state: returnContract.exitState, contains:"" };
                        }
                    }
                }
            }
        }



        // 1. Binary Operations (Conditions!) -> bool is_safe = ptr != NULL
        console.log(coreJp.code)
        if (coreJp instanceof BinaryOp && (coreJp.operator === "==" || coreJp.operator === "!=")) {
            console.log("Binaryop",coreJp.code )
            const leftOp = this.resolveAlias(coreJp.left.code.replace(/[()]/g, "").trim());
            const rightOp = this.resolveAlias(coreJp.right.code.replace(/[()]/g, "").trim());
            console.log(leftOp, rightOp)
            const leftState = this.getState(leftOp);
            const rightState = this.getState(rightOp);
            console.log(leftState, rightState)

            const isNullLiteral = (str: string) => {
                return str === "NULL" || str === "0" || str.replace(/\s/g, "") === "(void*)0";
            };

            const isLeftNull = leftState === Nullability.NULL || isNullLiteral(leftOp);
            const isRightNull = rightState === Nullability.NULL || isNullLiteral(rightOp);

            console.log(isLeftNull,isRightNull)

            // If either side is NULL, we successfully captured a nullability condition!
            if (isLeftNull || isRightNull) {
                const targetVar = isRightNull ? leftOp : rightOp;
                return {
                    kind: "condition",
                    targetVar: targetVar,
                    isEqToNull: coreJp.operator === "=="
                };
            }
        }

        // 2. Literal Nulls
        if (code.match(/\bNULL\b/) || code.includes("= 0") || code.includes("(void *) 0")) {
            return { kind: "var", state: Nullability.NULL, contains :"NULL" };
        }
        
        code = code.replace(/[()]/g, "");
        code = this.resolveAlias(code); 

        // 3. Logical NOT
        if (code.startsWith("!")) {
            const innerCode = code.substring(1).trim();
            const innerVal = this.store.get(innerCode) || this.resolveRhsValue($jp, innerCode);
            
            if (innerVal.kind === "condition") {
                return { kind: "condition", targetVar: innerVal.targetVar, isEqToNull: !innerVal.isEqToNull };
            } else if (innerVal.kind === "pointer" || innerVal.kind==="var") {
                const inverted = innerVal.state === Nullability.NOT_NULL ? Nullability.NULL : Nullability.MAYBE_NULL;
                return { kind: innerVal.kind, state: inverted, contains: innerVal.contains };
            }
            return { kind: "var", state: Nullability.MAYBE_NULL, contains:"" };
        }

        // --- 4. THE FIX: Variable to Variable Alias Tracking ---
        if (this.store.has(code)) {
            const existingVar = this.store.get(code)!;
            if( existingVar.kind === "pointer" || existingVar.kind === "var"){
                return {kind: existingVar.kind, state: existingVar.state, contains: code }
            }
            return existingVar;
            // If assigning a condition, copy the condition logic
            if (existingVar.kind === "condition") return existingVar;

            

            if(existingVar.kind=== "object") return {kind: "state", state: Nullability.NOT_NULL}
            
            // Otherwise, make this variable a symbolic pointer to the root variable!
            //return { kind: "var", contains: code, state: existingVar.state };
        }

        /*// 5. Symbolic Pointers (Address-Of Operator) -> c = &a
        if (code.includes("&")) {
            const match = code.match(/&([a-zA-Z0-9_.\->\[\]]+)/);
            if (match) {
                return { kind: "pointer", contains: this.resolveAlias(match[1]) };
            }
            return { kind: "state", value: Nullability.NOT_NULL };
        }

        // 6. Pointer Dereferences
        if (code.startsWith("*")) {
            return { kind: "state", value: this.getState(code) };
        }

        // 7. Embedded Assignments
        const parts = code.split("=");
        if (parts.length > 1) {
            let rhs = parts[1].replace(";", "").trim();
            rhs = this.resolveAlias(rhs); 

            if (rhs.startsWith("*")) {
                rhs = rhs.substring(1).trim();
                const pointerState = this.getState(rhs);
                return { kind: "state", value: pointerState === Nullability.NOT_NULL ? Nullability.NOT_NULL : Nullability.MAYBE_NULL };
            }
            return this.store.get(rhs) ?? { kind: "state", value: Nullability.MAYBE_NULL };
        }*/

        return { kind: "var", state: Nullability.MAYBE_NULL, contains: "" };
    }

    trackDefinition($jp: Joinpoint, leftName: string, rightJp: Expression) {

        if (rightJp instanceof Call || Query.searchFrom(rightJp, Call).first()) {
            this.aliasMap.delete(leftName); // Clear old aliases just in case
            return; 
        }

        if (!leftName.startsWith("__coral_var_")) return;

        let coreJp = rightJp;
        while (coreJp instanceof ParenExpr) {
            coreJp = coreJp.subExpr;
        }

        const cleanRightCode = coreJp.code.replace(/[()]/g, "").trim();
        if (cleanRightCode.match(/^[*]*[!a-zA-Z_][a-zA-Z0-9_.\->\[\]]*$/)) {
            const rootVar = this.resolveAlias(cleanRightCode);
            this.aliasMap.set(leftName, rootVar);
        }
    }


    storeVar($jp: Varref | Param){
        const varName = $jp.name;
        const isPointer = $jp.type.joinPointType === "pointerType" || $jp.type.code.includes("*");
        const isStructer = $jp.type.code.includes("struct");
        console.log(isPointer)
        if(isPointer){
        
            let code =$jp.type.code;
            console.log(code)
            let nStars = 0;
            while(code.endsWith("*")){
                let state:MemoryNode ={kind:"pointer", contains:undefined, state: Nullability.MAYBE_NULL};
                
                code= code.substring(0, code.length -1).trim();
                console.log(code)
                nStars++;
                state.contains=code.endsWith("*")?("*".repeat(nStars)+varName): undefined
                this.store.set("*".repeat(nStars-1) + varName, state)
            }

            let state: MemoryNode;
            if(isStructer){
                state ={kind:"object", fields: new Set()};
            }else{
                state ={kind:"var", contains:undefined, state: Nullability.MAYBE_NULL};
            }
            this.store.set("*".repeat(nStars) + varName, state)

            console.log(this.store)

        }else if(isStructer){
            this.store.set(varName, {kind:"object", fields: new Set()})
        }
        else{
            this.store.set(varName, {kind:"var", contains:undefined, state: Nullability.MAYBE_NULL})
        }
    }

    setNullability($var:string, nullability: Nullability){
        if(this.store.has($var)){
            const state = this.store.get($var);
            if(state?.kind === "pointer" || state?.kind === "var"){
                this.store.set($var, {kind: state.kind, contains: state.contains, state: nullability});
                return
            }
        }
        console.log(this)
        throw new Error("SetNullability var is not store "+ $var );
    }
}
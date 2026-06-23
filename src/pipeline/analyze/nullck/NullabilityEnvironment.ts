import { Nullability, Contract } from "@specs-feup/coral/symbol/Nullability";
import { Expression, Joinpoint, BinaryOp, ParenExpr, Call, Varref, Param, UnaryOp } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";

export type NullabilityVar = 
    | { kind: "state"; value: Nullability }
    | { kind: "pointer"; pointsTo: string }
    | { kind: "condition"; targetVar: string; isEq: boolean };

   

export type MemoryNode = PointerNode | ObjectNode | ConditionNode | VarNode | FunctionNode  ;

export interface PointerNode {
    kind: "pointer";
    state?: Nullability;
    pointsTo: Set<string>;
    exist?: boolean
}

export interface ObjectNode {
    kind: "object";
    fields: Set<string>;
    exists?: boolean;
}

export interface ConditionNode {
    kind: "condition";
    targetVar: string;
    isEqToNull: boolean; 
}

export interface VarNode {
    kind: "var";
    contains?: string;
    exists?: boolean
}


export interface FunctionNode{
    kind: "function",
    returnState?: Nullability
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
        //// console.log("Merging", env1.store, env2.store)
        const mergedStore = new Map<string, MemoryNode>();

        const allKeys = new Set([...env1.store.keys(), ...env2.store.keys()]);

        for (const key of allKeys) {
            const val1 = env1.store.get(key);
            const val2 = env2.store.get(key);

            if (val1 !== undefined && val2 !== undefined) {
                // If they are structurally identical, keep them exactly as they are.
                if(val1.kind=== "pointer" && val2.kind=== "pointer"){
                    const state1= env1.getState(key);
                    const state2 = env2.getState(key);
                    const mergeState = state1 === state2 ? state1 : Nullability.MAYBE_NULL;
                    const mergedPoints = new Set([...val1.pointsTo, ...val2.pointsTo]);
                    mergedStore.set(key, { kind: "pointer", pointsTo: mergedPoints, state: mergedPoints.size > 1? mergeState: undefined });
                }
                else if( val1.kind === "var" && val2.kind==="var"){
                    //// console.log("ola? 3")
                    mergedStore.set(key, { kind: "var", contains: val1.contains=== val2.contains? val1.contains : undefined,  exists: val1.exists === val2.exists?val1.exists: undefined  });
                }
                else if( val1.kind === "function" && val2.kind === "function"){
                    mergedStore.set(key, { kind: "function", returnState: val1.returnState=== val2.returnState? val1.returnState : Nullability.MAYBE_NULL });
               
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
        //// console.log(val);
        if (!val){ 

            const pos = name.indexOf(".");
            if(pos !== -1){
                //// console.log("por favor")
                
                const objectName = name.slice(0, pos);
                let object = this.store.get(objectName);
                let cleanObjectName = objectName;
                if(object?.kind==="pointer"){
                    let set = object.pointsTo
                    for (let s of set){
                        cleanObjectName = s
                    }
                }
                const fieldName = name.slice(pos +1)
                //// console.log(this.aliasMap, objectName, cleanObjectName, fieldName)
                if(this.store.has(cleanObjectName + '.' + fieldName)){
                    return this.getState(cleanObjectName + '.' + fieldName)
                }
            }

            return Nullability.MAYBE_NULL;
        }
        if( val.kind === "function"){
            return val.returnState?? Nullability.MAYBE_NULL
        }
        if (val.kind === "pointer") {
            if(val.state) return val.state;
            if(val.pointsTo.size === 0) return Nullability.NULL;
            let $state;
            //// console.log(val.state)
            
            //// console.log(val.pointsTo)
            for (let $var of val.pointsTo){
                //// console.log($var);
                let $varState = this.getState($var);
                if(!$state) $state = $varState;
                else if($state !== $varState ) $state = Nullability.MAYBE_NULL;
            }
            //// console.log($state)
            return $state!;
        }
        if(val.kind==="var" && val.contains && isNullLiteral(val.contains)){
            return Nullability.NULL
        }
       
        if (val.kind === "var" || val.kind==="object") {

            if(val.exists !== undefined){
                return val.exists? Nullability.NOT_NULL : Nullability.NULL;
            }
        }



        

        
        return Nullability.MAYBE_NULL; 
    }

    resolveAlias(name: string): string {
        const state = this.store.get(name)
        if(  state && state.kind==="pointer"){
             if ( this.aliasMap.has(name)){
                return this.aliasMap.get(name)!;
             }
        }
        return name;
    }

    resolveRhsValue(lhsState: MemoryNode, coreJp: Joinpoint, code: string): MemoryNode {
        //// console.log("---------------------------")
       
        while (coreJp instanceof ParenExpr) {
            coreJp = coreJp.subExpr;
        }

        if (coreJp instanceof UnaryOp){
            // console.log("unary", coreJp.code)
            if(coreJp.operator === "!"){

                const cleanVar = coreJp.code.substring(1).trim();
                const varState = this.store.get(cleanVar);
                if(varState && varState.kind==="pointer"){
                    return {kind: "condition", targetVar: cleanVar, isEqToNull: true}
                }
            }
            if( coreJp.code.startsWith("&")){
                return {kind: "pointer", pointsTo: new Set([ coreJp.code.substring(1).trim()])}
            }
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
                            const function_name = "function " + callee.name;
                            if(!this.store.has(function_name)){
                                this.store.set(function_name, {kind: "function", returnState: returnContract.exitState })
                            }
                            return { kind: "pointer", pointsTo: new Set([function_name])};
                        }
                    }
                }
                const function_name = "function " + callee.name;
                if(!this.store.has(function_name)){
                    this.store.set(function_name, {kind: "function", returnState: Nullability.MAYBE_NULL })
                }
                if(lhsState.kind==="pointer"){
                    return {kind:"pointer", pointsTo: new Set([function_name])}
                }

            }
        }



        // 1. Binary Operations (Conditions!) -> bool is_safe = ptr != NULL
        
        if (coreJp instanceof BinaryOp && (coreJp.operator === "==" || coreJp.operator === "!=")) {

            //// console.log("Binaryop",coreJp.code )
            const leftOp = coreJp.left.code.replace(/[()]/g, "").trim();
            const rightOp = coreJp.right.code.replace(/[()]/g, "").trim();


            // console.log("conditions,", leftOp, rightOp)
            const leftState = this.getState(leftOp);
            const rightState = this.getState(rightOp);
            // console.log(leftState, rightState)

            const isNullLiteral = (str: string) => {
                return str === "NULL" || str === "0" || str.replace(/\s/g, "") === "(void*)0" ;
            };

            const isLeftNull = leftState === Nullability.NULL || isNullLiteral(leftOp);
            const isRightNull = rightState === Nullability.NULL || isNullLiteral(rightOp);

            //// console.log(isLeftNull,isRightNull)

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
            return { kind: "var", exists:true, contains :"NULL" };
        }
        
        code = code.replace(/[()]/g, "");
        code = this.resolveAlias(code); 

        // 3. Logical NOT
        if (code.startsWith("!")) {
            const innerCode = code.substring(1).trim();
            const innerVal = this.store.get(innerCode) || this.resolveRhsValue(lhsState,coreJp, innerCode);
            
            if (innerVal.kind === "condition") {
                return { kind: "condition", targetVar: innerVal.targetVar, isEqToNull: !innerVal.isEqToNull };
            }
            return { kind: "var", exists: true, contains:"!NULL" };
        }

        // --- 4. THE FIX: Variable to Variable Alias Tracking ---
        if (this.store.has(code)) {
            const existingVar = this.store.get(code)!;
           
            return existingVar;
           
        }
        //// console.log("otherwise, ", code)
        if(code.split(".").length > 1|| code.split("->").length >1 ){
            //// console.log("this is an object")
        }

        
        // console.log("why?")
        return lhsState;
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
        if(isPointer){
            let code =$jp.type.code;
         
            let nStars = 0;
            while(code.endsWith("*")){
                let state:MemoryNode ={kind:"pointer", pointsTo : new Set()};
                code= code.substring(0, code.length -1).trim();
                nStars++;
                state.pointsTo.add(("*".repeat(nStars)+varName));
                if(code.endsWith("*")){
                    state.pointsTo.add(("*".repeat(nStars)+varName));
                }
                this.store.set("*".repeat(nStars-1) + varName, state)
            }

            let state: MemoryNode;
            if(isStructer){
                state ={kind:"object", fields: new Set()};
            }else{
                state ={kind:"var", contains:undefined};
            }
            this.store.set("*".repeat(nStars) + varName, state)

            //// console.log(this.store)

        }else if(isStructer){
            this.store.set(varName, {kind:"object", fields: new Set(), exists:true})
        }
        else{
            
            this.store.set(varName, {kind:"var", contains:undefined, exists: true})
            //// console.log("dan dos dand, ", this.store)
        }
    }

    setNullability($var:string, nullability: Nullability){
        //// console.log("What is this var, ", $var)
        if(this.store.has($var)){
            const state = this.store.get($var);
            if(state?.kind==="pointer"){
                if(state.pointsTo.size===1){
                    state.pointsTo.forEach( n=> {
                        const $var = this.store.get(n)!;
                        //// console.log("exist pelase", nullability)
                        let exist = (nullability === Nullability.NOT_NULL)? true: (nullability===Nullability.NULL? false:undefined)
                        //// console.log("exist pelase", exist)
                        if($var.kind==="pointer")
                            this.store.set(n, {kind: "pointer", exist: exist, pointsTo: $var.pointsTo});
                        if( $var?.kind === "var"){
                            this.store.set(n, {kind: "var", contains: $var.contains, exists:exist});
                        }
                        if( $var?.kind === "object"){
                            this.store.set(n, {kind: "object", fields: $var.fields, exists: exist});
                        }
                        if( $var?.kind === "function"){
                            this.store.set(n, {kind: "function", returnState: nullability});
                        }
                    });
                }
                else{
                    state.state= nullability;
                }
                return;
            }
            let exist = (Nullability.NOT_NULL=== nullability)? true: (Nullability.NULL=== nullability? false:undefined)
            if( state?.kind === "var"){
                this.store.set($var, {kind: state.kind, contains: state.contains, exists:exist});
                return
            }
            if( state?.kind === "object"){
                this.store.set($var, {kind: state.kind, fields: state.fields, exists: exist});
                return
            }

        }
        //// console.log(this)
        throw new Error("SetNullability var is not store "+ $var );
    }

    removeWithNullability($var:string, nullability: Nullability){
        if(this.store.has($var)){
            const state = this.store.get($var);
            if(state?.kind==="pointer"){
                state.pointsTo.forEach(n =>{
                    if(this.getState(n) === nullability) 
                        state.pointsTo.delete(n);
                })
            }
        }
    }

    getPointerType ($varName:string): string{
        let $var = this.store.get($varName);
        while( $var?.kind === "pointer"){
            $var = this.store.get("*" + $varName);
        }
        return $var!.kind;
    }

    
}
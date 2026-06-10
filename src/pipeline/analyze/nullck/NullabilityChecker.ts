import { Joinpoint, BinaryOp, Vardecl, MemberAccess, UnaryOp, Call, ArrayAccess } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import NullDereferenceError from "@specs-feup/coral/error/null_safety/NullDereferenceError";
import PotentialNullDereferenceError from "@specs-feup/coral/error/null_safety/PotentialNullDereferenceError";
import PreconditionViolationError from "@specs-feup/coral/error/null_safety/PreconditionViolationError";
import { Contract, Nullability } from "@specs-feup/coral/symbol/Nullability";
import { NullabilityEnvironment } from "./NullabilityEnvironment.js";


export type DereferenceRecord = {
    jp: Joinpoint;
    varName: string;
    state: Nullability;
};

export class NullabilityChecker {
    
    static verifyDereferences(jp: Joinpoint, env: NullabilityEnvironment, dereferences: Map<string, DereferenceRecord>) {
        
        if (jp instanceof BinaryOp || jp instanceof Vardecl) {
            //console.log("hahahah?")
            for (const ma of Query.searchFrom(jp, MemberAccess)) {
                if (ma.arrow) {
                    const baseVar = ma.base.code.replace(/[()]/g, "").trim();
                    const rootVar = env.resolveAlias(baseVar); 
                    const pointerState = env.getState(rootVar); 

                    this.recordDereference(ma, rootVar, pointerState, dereferences);
                }
            }
            
            for (const ma of Query.searchFrom(jp, UnaryOp)) {
                //console.log(ma.operator, ma.code)
                if (ma.operator === "*") {
                    //console.log("??")
                    const baseVar = ma.operand.code.replace(/[()]/g, "").trim();
                    const rootVar = env.resolveAlias(baseVar); 
                    const pointerState = env.getState(rootVar); 
                    //console.log(pointerState)
                    this.recordDereference(ma, rootVar, pointerState, dereferences);
                }
            }

            for (const aa of Query.searchFrom(jp, ArrayAccess)) {
                const baseVar = aa.name.replace(/[()]/g, "").trim();
                const rootVar = env.resolveAlias(baseVar); 
                const pointerState = env.getState(rootVar); 
        
                this.recordDereference(aa, rootVar, pointerState, dereferences);
            }
        }
    }

    private static recordDereference(jp: Joinpoint, varName: string, state: Nullability, dereferences: Map<string, DereferenceRecord>) {
        // Fallback to astId if originNode isn't available
        const originId = jp.originNode ? jp.originNode.astId : jp.astId;
        const key = `${originId}_${varName}`;

        const existing = dereferences.get(key);
        if (existing) {
            // If the node was NULL on one path, but NOT_NULL on another, they merge into MAYBE_NULL!
            if (existing.state !== state) {
                existing.state = Nullability.MAYBE_NULL;
            }
        } else {
            dereferences.set(key, { jp, varName, state });
        }
    }

    static applyFunctionContracts(callJp: Call, env: NullabilityEnvironment, globalVars: Set<string>) {



        const callee = callJp.function;
        if (!callee) return;

        const raw = callee.getUserField("coralContracts") as unknown as string | undefined;
        let contracts: Contract[] = [];
        if (raw) {
            contracts = JSON.parse(raw) as Contract[];
        }

        for (const globalVar of globalVars) {
        
            const contract = contracts.find(c => c.target === globalVar && c.isGlobal);

            if (contract && contract.unchanged) {
                continue;
            } else if (contract && contract.exitState !== undefined) {
                env.setNullability(globalVar, contract.exitState );
            } else {
                if (env.store.has(globalVar)) {
                   env.setNullability(globalVar, Nullability.MAYBE_NULL );
                }
            }
        }
        
        const args = callJp.args;
        const params = callee.params;

        for (let i = 0; i < args.length && i < params.length; i++) {
            const paramName = params[i].name;
            const paramContract = contracts.find(c => c.target.trim() === paramName.trim() && !c.isGlobal);
            
            const argCode = args[i].code.replace(/[()]/g, "").trim();
            const rootVar = env.resolveAlias(argCode);
                
            if (paramContract && paramContract.entryState) {
               const argNullability = env.getState(rootVar);
                const paramNullability = paramContract.entryState;
                
                if (paramNullability !== Nullability.MAYBE_NULL && paramNullability !== argNullability) {
                    throw new PreconditionViolationError(callJp, rootVar, callee.name, paramNullability as string, argNullability as string);
                }
                if(paramContract.fields) {
                    //console.log("Estes fiels, ", paramContract.fields)
                    for (const [key, value] of Object.entries(paramContract.fields)) {
                        const $field = rootVar + '.' + key;
                        const $fieldNullability = env.getState($field);
                        const $expectedFieldNullability = value.entryState;
                        if ($expectedFieldNullability !== Nullability.MAYBE_NULL && $fieldNullability !== $expectedFieldNullability) {
                            throw new PreconditionViolationError(callJp, $field, callee.name, $expectedFieldNullability as string, $fieldNullability as string);
                        }
                    }
                }
               
            }

            //console.log(paramName, paramContract, argCode, rootVar  )
            const finalState = (paramContract && paramContract.exitState) ? paramContract.exitState : Nullability.MAYBE_NULL;
            env.setNullability(rootVar,  finalState );
            let aux =env.store.get(rootVar)!;
            if(aux.kind==="object" ){
                for ( let field of aux.fields){
                    const finalState = (paramContract && paramContract.fields && field in paramContract.fields && paramContract.fields[field].exitState) ? paramContract.exitState! : Nullability.MAYBE_NULL;
                    env.setNullability(rootVar + '.' + field,  finalState );
                }
            }
            

        }
        //console.log("apply functio ", env)
    }
}
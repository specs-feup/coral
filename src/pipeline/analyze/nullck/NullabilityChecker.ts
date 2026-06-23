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
            //// console.log("hahahah?")
            for (const ma of Query.searchFrom(jp, MemberAccess)) {
                if (ma.arrow) {
                    const baseVar = ma.base.code.replace(/[()]/g, "").trim();
                    const rootVar = env.resolveAlias(baseVar); 
                    const pointerState = env.getState(rootVar); 

                    this.recordDereference(ma, rootVar, pointerState, dereferences);
                }
            }
            
            for (const ma of Query.searchFrom(jp, UnaryOp)) {
                //// console.log(ma.operator, ma.code)
                if (ma.operator === "*") {
                    //// console.log("??")
                    const baseVar = ma.operand.code.replace(/[()]/g, "").trim();
                    const rootVar = env.resolveAlias(baseVar); 
                    const pointerState = env.getState(rootVar); 
                    //// console.log(pointerState)
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

    static applyFunctionContracts(callJp: Call, env: NullabilityEnvironment, globalVars: Set<string>, fnSymbol: any) {
        const callee = callJp.function;
        if (!callee || !fnSymbol) return;
    
        // ==========================================
        // 1. HANDLE GLOBAL VARIABLES (Side-Effects)
        // ==========================================
        for (const globalVar of globalVars) {
            const globalContract = fnSymbol.globalContracts?.[globalVar];
    
            if (globalContract?.unchanged) {
                // Guarantee: The function does not touch this global.
                continue; 
            } else if (globalContract?.exitState) {
                // Guarantee: The function sets the global to a specific state.
                env.setNullability(globalVar, globalContract.exitState);
            } else {
                // Side-Effect Invalidation: No guarantee exists! 
                // Downgrade to MAYBE_NULL to prevent false-negatives.
                if (env.store.has(globalVar)) {
                    env.setNullability(globalVar, Nullability.MAYBE_NULL);
                }
            }
        }
    
        // ==========================================
        // 2. HANDLE PARAMETERS & VARIADIC ARGS
        // ==========================================
        const args = callJp.args;
        const params = fnSymbol.params; 
        const compiledContracts = fnSymbol.compiledParamContracts || [];
    
        // Notice we loop over ARGS, not params. This captures variadic arguments!
        for (let i = 0; i < args.length; i++) {
            const argCode = args[i].code.replace(/[()]/g, "").trim();
            const rootVar = env.resolveAlias(argCode);
            
            // Variables to hold the rules for this specific argument
            let expectedNullability: Nullability | undefined = undefined;
            let finalNullability: Nullability | undefined = undefined;
            let isReadOnly = false;
            let fieldRules: any = undefined;
    
            // --- LANE 1: Standard Parameter ---
            // Fast, O(1) lookup using the states we saved in the Annotator pass
            if (i < params.length) {
                const paramSymbol = params[i];
                expectedNullability = paramSymbol.initialNullability;
                finalNullability = paramSymbol.finalNullability;
                isReadOnly = paramSymbol.isReadOnly;
                fieldRules = paramSymbol.fieldsNullability;
            } 
            // --- LANE 2: Variadic Argument ---
            // Fallback: Test the argument's code against our pre-compiled regex rules
            else {
                const matchedRule = compiledContracts.find((c: any) => 
                    c.compiledRegex && c.compiledRegex.test(argCode)
                );
    
                if (matchedRule) {
                    expectedNullability = matchedRule.entryState;
                    finalNullability = matchedRule.exitState;
                    isReadOnly = matchedRule.unchanged;
                    fieldRules = matchedRule.fields;
                }
            }
    
            // ==========================================
            // 3. APPLY PRE-CONDITIONS (Entry State)
            // ==========================================
            if (expectedNullability) {
                const argNullability = env.getState(rootVar);
                
                if (expectedNullability !== Nullability.MAYBE_NULL && expectedNullability !== argNullability) {
                    throw new PreconditionViolationError(callJp, rootVar, callee.name, expectedNullability, argNullability as string);
                }
                
                // A. Struct Field Pre-Conditions
                if (fieldRules) {
                    for (const [fieldKey, fieldStates] of Object.entries(fieldRules)) {
                        const $field = `${rootVar}.${fieldKey}`;
                        const $fieldNullability = env.getState($field);
                        // Handle both standard params and regex matched fields
                        const $expectedFieldNullability = (fieldStates as any).initialNullability || (fieldStates as any).entryState;
    
                        if ($expectedFieldNullability && $expectedFieldNullability !== Nullability.MAYBE_NULL && $fieldNullability !== $expectedFieldNullability) {
                            throw new PreconditionViolationError(callJp, $field, callee.name, $expectedFieldNullability, $fieldNullability as string);
                        }
                    }
                }
            }
    
            // ==========================================
            // 4. APPLY POST-CONDITIONS (Exit State)
            // ==========================================
            if (!isReadOnly && env.store.has(rootVar)) {
                
                // If the parameter is mutated but has no exit contract, safely downgrade.
                const finalState = finalNullability || Nullability.MAYBE_NULL;
                env.setNullability(rootVar, finalState);
    
                // B. Struct Field Post-Conditions
                const storeVar = env.store.get(rootVar)!;
                if (storeVar.kind === "object") {
                    for (const field of storeVar.fields) {
                        const fieldStates = fieldRules?.[field];
                        const fieldFinalState = fieldStates?.finalNullability || fieldStates?.exitState || Nullability.MAYBE_NULL;
                        env.setNullability(`${rootVar}.${field}`, fieldFinalState);
                    }
                }
            }
        }
    }
}
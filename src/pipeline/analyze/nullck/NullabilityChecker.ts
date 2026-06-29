import { Joinpoint, BinaryOp, Vardecl, MemberAccess, UnaryOp, Call, ArrayAccess } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import NullDereferenceError from "@specs-feup/coral/error/null_safety/NullDereferenceError";
import PotentialNullDereferenceError from "@specs-feup/coral/error/null_safety/PotentialNullDereferenceError";
import PreconditionViolationError from "@specs-feup/coral/error/null_safety/PreconditionViolationError";
import { Contract, Nullability } from "@specs-feup/coral/symbol/Nullability";
import { NullabilityEnvironment } from "./NullabilityEnvironment.js";
import { BuiltInContractRegistry } from "./BuiltInContractRegistry.js";

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

    static applyFunctionContracts(callJp: Call, env: NullabilityEnvironment, globalVars: Set<string>) {
        // Some unresolved C functions might not have a full callee object, 
        // so it's safer to get the name directly from the call node if callee is missing.
        const callee = callJp.function;
        const funcName = callee?.name || callJp.name; 
        
        // ==========================================
        // 1. FETCH CONTRACTS (Built-in vs User)
        // ==========================================
        let contracts: Contract[] = [];
        const registry = BuiltInContractRegistry.getInstance();
    
        if (registry.hasContract(funcName)) {
            // 1A. It's a standard library function, use our fast JSON map!
            contracts = registry.getContracts(funcName);
        } else if (callee) {
            // 1B. It's user code, check the AST for #pragma annotations
            const raw = callee.getUserField("coralContracts") as unknown as string | undefined;
            if (raw) {
                contracts = JSON.parse(raw) as Contract[];
            }
        }
        console.log("Contracts,", contracts)
        // if (contracts.length === 0) return; // Fast exit if no contracts exist
    
        // ==========================================
        // 2. HANDLE GLOBAL VARIABLES
        // ==========================================
        for (const globalVar of globalVars) {
            const globalContract = contracts.find(c => c.target === globalVar && c.isGlobal);
    
            if (globalContract?.unchanged) {
                continue;
            } else if (globalContract?.exitState) {
                env.setNullability(globalVar, globalContract.exitState);
            } else {
                if (env.store.has(globalVar)) {
                    env.setNullability(globalVar, Nullability.MAYBE_NULL);
                }
            }
        }
    
        // ==========================================
        // 3. HANDLE PARAMETERS & VARIADIC ARGS
        // ==========================================
        const args = callJp.args;
        const params = callee?.params || []; // safe fallback if callee is undefined
    
        for (let i = 0; i < args.length; i++) {
            const argCode = args[i].code.replace(/[()]/g, "").trim();
            const rootVar = env.resolveAlias(argCode);
    
            // Find the contract for this specific argument
            let paramContract: Contract | undefined = undefined;
    
            if (i < params.length) {
                // Standard Parameter: Match by exact AST name or Regex
                const paramName = params[i].name.trim();
                paramContract = contracts.find(c => {
                    if (c.isGlobal || c.target === "return") return false;
                    if (c.isRegex) {
                        // OPTIMIZATION: Use the pre-compiled regex if it exists!
                        const regex = c.compiledRegex || new RegExp(c.target);
                        return regex.test(paramName);
                    }
                    return c.target === paramName;
                });
            } else {
                // Variadic Argument (e.g., printf, free): Match argument code against Regex
                paramContract = contracts.find(c => {
                    if (c.isGlobal || c.target === "return") return false;
                    if (c.isRegex) {
                        // OPTIMIZATION: Use the pre-compiled regex if it exists!
                        const regex = c.compiledRegex || new RegExp(c.target);
                        return regex.test(argCode);
                    }
                    return false;
                });
            }
    
            // --- A. PRE-CONDITIONS (Entry State) ---
            if (paramContract && paramContract.entryState) {
                const expectedNullability = paramContract.entryState;
                const argNullability = env.getState(rootVar);
    
                if (expectedNullability !== Nullability.MAYBE_NULL && expectedNullability !== argNullability) {
                    throw new PreconditionViolationError(callJp, rootVar, funcName, expectedNullability as string, argNullability as string);
                }
                
                // Apply Struct Field Pre-Conditions
                if (paramContract.fields) {
                    for (const [key, fieldContract] of Object.entries(paramContract.fields)) {
                        const $field = rootVar + '.' + key;
                        const $fieldNullability = env.getState($field);
                        const $expectedFieldNullability = fieldContract.entryState;
                        
                        if ($expectedFieldNullability && $expectedFieldNullability !== Nullability.MAYBE_NULL && $fieldNullability !== $expectedFieldNullability) {
                            throw new PreconditionViolationError(callJp, $field, funcName, $expectedFieldNullability as string, $fieldNullability as string);
                        }
                    }
                }
            }
    
            // --- B. POST-CONDITIONS (Exit State) ---
            if (!paramContract?.unchanged && env.store.has(rootVar)) {
                // If the parameter is mutated but has no exit contract, safely downgrade to MAYBE_NULL
                const finalState = paramContract?.exitState || Nullability.MAYBE_NULL;
                env.setNullability(rootVar, finalState);
    
                // Apply Struct Field Post-Conditions
                const storeVar = env.store.get(rootVar)!;
                if (storeVar.kind === "object") {
                    for (const field of storeVar.fields) {
                        const fieldFinalState = paramContract?.fields?.[field]?.exitState || Nullability.MAYBE_NULL;
                        env.setNullability(`${rootVar}.${field}`, fieldFinalState);
                    }
                }
            }
        }
    }
}
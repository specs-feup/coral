import { Joinpoint, BinaryOp, Vardecl, MemberAccess, UnaryOp, Call } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import NullDereferenceError from "@specs-feup/coral/error/null_safety/NullDereferenceError";
import PotentialNullDereferenceError from "@specs-feup/coral/error/null_safety/PotentialNullDereferenceError";
import PreconditionViolationError from "@specs-feup/coral/error/null_safety/PreconditionViolationError";
import { Contract, Nullability } from "@specs-feup/coral/symbol/Nullability";
import { NullabilityEnvironment } from "./NullabilityEnvironment.js";

export class NullabilityChecker {
    
    /**
     * Checks an AST node for any pointer or struct dereferences and ensures they are safe.
     */
    static verifyDereferences(jp: Joinpoint, env: NullabilityEnvironment) {
        if (jp instanceof BinaryOp || jp instanceof Vardecl) {
            // 1. Check Struct Accesses (d->value)
            for (const ma of Query.searchFrom(jp, MemberAccess)) {
                if (ma.arrow) {
                    const baseVar = ma.base.code.replace(/[()]/g, "").trim();
                    const rootVar = env.resolveAlias(baseVar); 
                    const pointerState = env.states.get(rootVar) ?? Nullability.MAYBE_NULL;

                    if (pointerState === Nullability.NULL) {
                        throw new NullDereferenceError(jp, rootVar, pointerState);
                    } else if (pointerState === Nullability.MAYBE_NULL) {
                        throw new PotentialNullDereferenceError(jp, rootVar);
                    }
                }
            }
            
            // 2. Check Pointer Dereferences (*dptr)
            for (const ma of Query.searchFrom(jp, UnaryOp)) {
                if (ma.operator === "*") {
                    const baseVar = ma.operand.code.replace(/[()]/g, "").trim();
                    const rootVar = env.resolveAlias(baseVar); 
                    const pointerState = env.states.get(rootVar) ?? Nullability.MAYBE_NULL;

                    if (pointerState === Nullability.NULL) {
                        throw new NullDereferenceError(jp, rootVar, pointerState);
                    } else if (pointerState === Nullability.MAYBE_NULL) {
                        throw new PotentialNullDereferenceError(jp, rootVar);
                    }
                }
            }
        }
    }

    /**
     * Validates function arguments against preconditions, and applies exit states to the environment.
     */
    static applyFunctionContracts(callJp: Call, env: NullabilityEnvironment) {
        const callee = callJp.function;
        if (!callee) return;

        const raw = callee.getUserField("coralContracts") as unknown as string | undefined;
        let contracts: Contract[] = [];
        if (raw) {
            contracts = JSON.parse(raw) as Contract[];
        }
        
        const args = callJp.args;
        const params = callee.params;

        for (let i = 0; i < args.length && i < params.length; i++) {
            const paramName = params[i].name;
            const paramContract = contracts.find(c => c.target.trim() === paramName.trim());
            
            // Resolve alias to find what the caller actually passed
            const argCode = args[i].code.replace(/[()]/g, "").trim();
            const rootVar = env.resolveAlias(argCode);
                
            // 1. Check Preconditions
            if (paramContract && paramContract.entryState) {
                const argNullability = env.states.get(rootVar) ?? Nullability.MAYBE_NULL;
                const paramNullability = paramContract.entryState;
                
                if (paramNullability !== Nullability.MAYBE_NULL && paramNullability !== argNullability) {
                    throw new PreconditionViolationError(callJp, rootVar, callee.name, paramNullability as string, argNullability as string);
                }
            }
            
            // 2. Apply Postconditions
            const finalState = (paramContract && paramContract.exitState) ? paramContract.exitState : Nullability.MAYBE_NULL;
            env.states.set(rootVar, finalState);
        }
    }
}
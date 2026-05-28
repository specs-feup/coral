import { Joinpoint, BinaryOp, Vardecl, MemberAccess, UnaryOp, Call } from "@specs-feup/clava/api/Joinpoints.js";
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
            for (const ma of Query.searchFrom(jp, MemberAccess)) {
                if (ma.arrow) {
                    const baseVar = ma.base.code.replace(/[()]/g, "").trim();
                    const rootVar = env.resolveAlias(baseVar); 
                    const pointerState = env.getState(rootVar); 

                    this.recordDereference(ma, rootVar, pointerState, dereferences);
                }
            }
            
            for (const ma of Query.searchFrom(jp, UnaryOp)) {
                if (ma.operator === "*") {
                    const baseVar = ma.operand.code.replace(/[()]/g, "").trim();
                    const rootVar = env.resolveAlias(baseVar); 
                    const pointerState = env.getState(rootVar); 

                    this.recordDereference(ma, rootVar, pointerState, dereferences);
                }
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

        for (const globalVar of globalVars) {
            if (env.store.has(globalVar)) {
                env.store.set(globalVar, { kind: "state", value: Nullability.MAYBE_NULL });
            }
        }

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
            
            const argCode = args[i].code.replace(/[()]/g, "").trim();
            const rootVar = env.resolveAlias(argCode);
                
            if (paramContract && paramContract.entryState) {
                const argNullability = env.getState(rootVar);
                const paramNullability = paramContract.entryState;
                
                if (paramNullability !== Nullability.MAYBE_NULL && paramNullability !== argNullability) {
                    throw new PreconditionViolationError(callJp, rootVar, callee.name, paramNullability as string, argNullability as string);
                }
            }
            
            const finalState = (paramContract && paramContract.exitState) ? paramContract.exitState : Nullability.MAYBE_NULL;
            env.store.set(rootVar, { kind: "state", value: finalState });
        }
    }
}
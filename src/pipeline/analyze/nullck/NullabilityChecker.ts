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

            for (const aa of Query.searchFrom(jp, ArrayAccess)) {
                const baseVar = aa.name.replace(/[()]/g, "").trim();
                const rootVar = env.resolveAlias(baseVar);
                const pointerState = env.getState(rootVar);

                this.recordDereference(aa, rootVar, pointerState, dereferences);
            }
        }
    }

    private static recordDereference(jp: Joinpoint, varName: string, state: Nullability, dereferences: Map<string, DereferenceRecord>) {

        const originId = jp.originNode ? jp.originNode.astId : jp.astId;
        const key = `${originId}_${varName}`;

        const existing = dereferences.get(key);
        if (existing) {

            if (existing.state !== state) {
                existing.state = Nullability.MAYBE_NULL;
            }
        } else {
            dereferences.set(key, { jp, varName, state });
        }
    }


    static applyFunctionContracts(callJp: Call, env: NullabilityEnvironment, globalVars: Set<string>) {

        const callee = callJp.function;
        const funcName = callee?.name || callJp.name;


        let contracts: Contract[] = [];
        const registry = BuiltInContractRegistry.getInstance();

        if (registry.hasContract(funcName)) {
            contracts = registry.getContracts(funcName);

        } else if (callee) {
            const raw = callee.getUserField("coralContracts") as unknown as string | undefined;
            if (raw) {
                contracts = JSON.parse(raw) as Contract[];
            }
        }


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


        const args = callJp.args;
        const params = callee?.params || [];

        for (let i = 0; i < args.length; i++) {
            const argCode = args[i].code.replace(/[()]/g, "").trim();
            const rootVar = env.resolveAlias(argCode);
            const paramName = i < params.length ? params[i].name.trim() : undefined;

            let paramContract: Contract | undefined = undefined;

            if (paramName) {
                paramContract = contracts.find(c => {
                    if (c.isGlobal || c.target === "return") return false;
                    if (c.isRegex) {
                        const regex = c.compiledRegex || new RegExp(c.target);
                        return regex.test(paramName);
                    }
                    return c.target === paramName;
                });
            } else {
                paramContract = contracts.find(c => {
                    if (c.isGlobal || c.target === "return") return false;
                    if (c.isRegex) {
                        const regex = c.compiledRegex || new RegExp(c.target);
                        return regex.test(argCode);
                    }
                    return false;
                });
            }


            if (!paramContract && registry.hasContract(funcName)) {

                const paramContracts = contracts.filter(c => !c.isGlobal && c.target !== "return");

                if (paramContracts.length > 0) {

                    paramContract = contracts.find(c => c.index === i);
                }
            }

            const mapFieldToCaller = (key: string): string => {
                if (key.startsWith("*")) {
                    const target = paramContract!.target;
                    return key.replace(target, rootVar);
                } else {
                    return `${rootVar}.${key}`;
                }
            };

            // --- A. PRE-CONDITIONS (Entry State) ---
            if (paramContract && paramContract.entryState) {
                const expectedNullability = paramContract.entryState;
                const argNullability = env.getState(rootVar);

                if (expectedNullability !== Nullability.MAYBE_NULL && expectedNullability !== argNullability) {
                    throw new PreconditionViolationError(callJp, rootVar, funcName, expectedNullability as string, argNullability as string);
                }


                if (paramContract.fields) {
                    for (const [key, fieldContract] of Object.entries(paramContract.fields)) {
                        const $field = mapFieldToCaller(key);
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

                const finalState = paramContract?.exitState || Nullability.MAYBE_NULL;

                env.setNullability(rootVar, finalState);


                const handledFields = new Set<string>();


                if (paramContract?.fields) {
                    for (const [key, fieldContract] of Object.entries(paramContract.fields)) {
                        const $field = mapFieldToCaller(key);
                        handledFields.add($field);

                        const fieldFinalState = fieldContract.exitState || Nullability.MAYBE_NULL;
                        env.setNullability($field, fieldFinalState);
                    }
                }


                const storeVar = env.store.get(rootVar)!;

                if (storeVar.kind === "object") {
                    for (const field of storeVar.fields) {

                        if (!paramContract?.fields?.[field]) {
                            env.setNullability(`${rootVar}.${field}`, Nullability.MAYBE_NULL);
                        }
                    }
                } else if (storeVar.kind === "pointer" && storeVar.pointsTo) {
                    for (const target of storeVar.pointsTo) {

                        const targetState = env.store.get(target);
                        if (targetState?.kind === "pointer" && !handledFields.has(target)) {
                            env.setNullability(target, Nullability.MAYBE_NULL);
                        }
                    }
                }
            }
        }
    }
}
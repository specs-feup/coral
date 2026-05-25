import { Nullability, Contract } from "@specs-feup/coral/symbol/Nullability";
import { Expression, Joinpoint, BinaryOp, ParenExpr, Call } from "@specs-feup/clava/api/Joinpoints.js";

export type NullabilityVar = 
    | { kind: "state"; value: Nullability }
    | { kind: "pointer"; pointsTo: string }
    | { kind: "condition"; targetVar: string; isEq: boolean };

export class NullabilityEnvironment {
    public store: Map<string, NullabilityVar>;
    public aliasMap: Map<string, string>;

    constructor(
        initialStore?: Map<string, NullabilityVar>, 
        aliasMap?: Map<string, string>
    ) {
        this.store = new Map(initialStore);
        this.aliasMap = new Map(aliasMap);
    }

    static merge(env1: NullabilityEnvironment, env2: NullabilityEnvironment): NullabilityEnvironment {
        const mergedStore = new Map<string, NullabilityVar>();

        for (const [key, val1] of env1.store) {
            const val2 = env2.store.get(key);
            if (val2 !== undefined) {
                if (JSON.stringify(val1) === JSON.stringify(val2)) {
                    mergedStore.set(key, val1);
                } else if (val1.kind === "state" && val2.kind === "state") {
                    mergedStore.set(key, { 
                        kind: "state", 
                        value: val1.value === val2.value ? val1.value : Nullability.MAYBE_NULL 
                    });
                } else {
                    mergedStore.set(key, { kind: "state", value: Nullability.MAYBE_NULL });
                }
            } else {
                mergedStore.set(key, val1);
            }
        }

        return new NullabilityEnvironment(mergedStore, env1.aliasMap);
    }

    getState(name: string): Nullability {
        const val = this.store.get(name);
        if (!val) return Nullability.MAYBE_NULL;
        
        if (val.kind === "state") return val.value;
        if (val.kind === "pointer") return this.getState(val.pointsTo);
        
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

    resolveRhsValue($jp: Joinpoint, code: string): NullabilityVar {
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
                                    isEq: returnContract.predicate.isEq
                                };
                            }
                        }
                        
                        // --- NEW: B. Is it a standard State? (e.g., get_safe_pointer) ---
                        if (returnContract.exitState) {
                            return { kind: "state", value: returnContract.exitState };
                        }
                    }
                }
            }
        }

        // 1. Binary Operations (Conditions!) -> bool is_safe = ptr != NULL
        if (coreJp instanceof BinaryOp && (coreJp.operator === "==" || coreJp.operator === "!=")) {
            const leftOp = this.resolveAlias(coreJp.left.code.replace(/[()]/g, "").trim());
            const rightOp = this.resolveAlias(coreJp.right.code.replace(/[()]/g, "").trim());

            const leftState = this.getState(leftOp);
            const rightState = this.getState(rightOp);

            if (leftState === Nullability.NULL || rightState === Nullability.NULL || rightOp === "NULL" || leftOp === "NULL") {
                const targetVar = (rightState === Nullability.NULL || rightOp === "NULL") ? leftOp : rightOp;
                return {
                    kind: "condition",
                    targetVar: targetVar,
                    isEq: coreJp.operator === "=="
                };
            }
        }

        // 2. Literal Nulls
        if (code.match(/\bNULL\b/) || code.includes("= 0") || code.includes("(void *) 0")) {
            return { kind: "state", value: Nullability.NULL };
        }
        
        code = code.replace(/[()]/g, "");
        code = this.resolveAlias(code); 

        // 3. Logical NOT
        if (code.startsWith("!")) {
            const innerCode = code.substring(1).trim();
            const innerVal = this.store.get(innerCode) || this.resolveRhsValue($jp, innerCode);
            
            if (innerVal.kind === "condition") {
                return { kind: "condition", targetVar: innerVal.targetVar, isEq: !innerVal.isEq };
            } else if (innerVal.kind === "state") {
                const inverted = innerVal.value === Nullability.NOT_NULL ? Nullability.NULL : Nullability.MAYBE_NULL;
                return { kind: "state", value: inverted };
            }
            return { kind: "state", value: Nullability.MAYBE_NULL };
        }

        // --- 4. THE FIX: Variable to Variable Alias Tracking ---
        if (this.store.has(code)) {
            const existingVar = this.store.get(code)!;
            // If assigning a condition, copy the condition logic
            if (existingVar.kind === "condition") return existingVar;
            
            // Otherwise, make this variable a symbolic pointer to the root variable!
            return { kind: "pointer", pointsTo: code };
        }

        // 5. Symbolic Pointers (Address-Of Operator) -> c = &a
        if (code.includes("&")) {
            const match = code.match(/&([a-zA-Z0-9_.\->\[\]]+)/);
            if (match) {
                return { kind: "pointer", pointsTo: this.resolveAlias(match[1]) };
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
        }

        return { kind: "state", value: Nullability.MAYBE_NULL };
    }

    trackDefinition($jp: Joinpoint, leftName: string, rightJp: Expression) {
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
}
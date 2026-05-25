import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import { Expression, Joinpoint, BinaryOp, ParenExpr } from "@specs-feup/clava/api/Joinpoints.js";

export type NullabilityState = Map<string, Nullability>;

export class NullabilityEnvironment {
    public states: NullabilityState;
    public aliasMap: Map<string, string>;
    public conditionDefs: Map<string, { targetVar: string, isEq: boolean }>;

    constructor(
        initialStates?: NullabilityState, 
        aliasMap?: Map<string, string>, 
        conditionDefs?: Map<string, { targetVar: string, isEq: boolean }>
    ) {
        this.states = new Map(initialStates);
        this.aliasMap = new Map(aliasMap);
        this.conditionDefs = new Map(conditionDefs);
    }

    /**
     * Calculates the union (meet) of two dataflow environments.
     * Returns a new Environment representing the combined state.
     */
    static merge(env1: NullabilityEnvironment, env2: NullabilityEnvironment): NullabilityEnvironment {
        const mergedStates = new Map(env2.states);

        for (const [key, val1] of env1.states) {
            const val2 = env2.states.get(key);
            if (val2 !== undefined) {
                // If both states agree, keep it. If they conflict, fallback to MAYBE_NULL.
                mergedStates.set(key, val1 === val2 ? val1 : Nullability.MAYBE_NULL);
            } else {
                mergedStates.set(key, val1);
            }
        }

        // We carry over the aliases and conditions from env1 (assuming they are structurally identical in the CFG)
        return new NullabilityEnvironment(mergedStates, env1.aliasMap, env1.conditionDefs);
    }

    /**
     * Recursively resolves variables through the alias map, 
     * preserving any pointer dereferences (*) along the way.
     * Example: "*__coral_var_0" -> "**dptr"
     */
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

    resolveRhsStateFromCode($jp: Joinpoint, code: string): Nullability {
        if (code.includes("NULL") || code.includes("= 0") || code.includes("(void *) 0")) {
            return Nullability.NULL;
        }
        
        code = code.replace(/[()]/g, "");
        code = this.resolveAlias(code); // Instantly resolves *__coral_var_X to **dptr

        if (code.startsWith("!")) {
            const res = this.resolveRhsStateFromCode($jp, code.substring(1).trim());
            return (res == Nullability.MAYBE_NULL) ? Nullability.MAYBE_NULL
                : res == Nullability.NOT_NULL ? Nullability.NULL
                    : Nullability.NOT_NULL;
        }

        if (this.states.has(code)) {
            return this.states.get(code)!;
        }

        if (code.includes("&")) {
            return Nullability.NOT_NULL;
        }

        if (code.startsWith("*")) {
            return this.states.get(code) ?? Nullability.MAYBE_NULL;
        }

        const parts = code.split("=");
        if (parts.length > 1) {
            let rhs = parts[1].replace(";", "").trim();
            rhs = this.resolveAlias(rhs); // Resolve aliases on the right side of the assignment too

            if (rhs.startsWith("*")) {
                rhs = rhs.substring(1).trim();
                const pointerState = this.states.get(rhs) ?? Nullability.MAYBE_NULL;
                return pointerState === Nullability.NOT_NULL ? Nullability.NOT_NULL : Nullability.MAYBE_NULL;
            }
            return this.states.get(rhs) ?? Nullability.MAYBE_NULL;
        }

        return Nullability.MAYBE_NULL;
    }

    trackDefinition($jp: Joinpoint, leftName: string, rightJp: Expression) {
        // GUARD CLAUSE: Only track auxiliary compiler variables.
        if (!leftName.startsWith("__coral_var_")) {
            return;
        }

        const rightCode = rightJp.code.trim();
        let coreJp = rightJp;
        while (coreJp instanceof ParenExpr) {
            coreJp = coreJp.subExpr;
        }

        if (coreJp instanceof BinaryOp && (coreJp.operator === "==" || coreJp.operator === "!=")) {
            const leftOp = coreJp.left.code.replace(/[()]/g, "").trim();
            const rightOp = coreJp.right.code.replace(/[()]/g, "").trim();
            const resolvedLeft = this.resolveAlias(leftOp);
            const resolvedRight = this.resolveAlias(rightOp);

            const leftState = this.resolveRhsStateFromCode($jp, resolvedLeft);
            const rightState = this.resolveRhsStateFromCode($jp, resolvedRight);

            if (leftState === Nullability.NULL || rightState === Nullability.NULL) {
                const targetVar = rightState === Nullability.NULL ? resolvedLeft : resolvedRight;
                this.conditionDefs.set(leftName, {
                    targetVar: targetVar,
                    isEq: coreJp.operator === "=="
                });
            }
            return;
        }

        const cleanRightCode = coreJp.code.replace(/[()]/g, "").trim();

        if (cleanRightCode.match(/^[*]*[!a-zA-Z_][a-zA-Z0-9_.\->\[\]]*$/)) {
            const rootVar = this.resolveAlias(cleanRightCode);
            this.aliasMap.set(leftName, rootVar);
        }
    }
}
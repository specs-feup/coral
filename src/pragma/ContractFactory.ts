import CoralPragma from "./CoralPragma.js";
import { Contract, Nullability } from "../symbol/Nullability.js";

export class ContractFactory {
    private static stateMap: Record<string, Nullability> = {
        "not-null": Nullability.NOT_NULL,
        "maybe-null": Nullability.MAYBE_NULL,
        "null": Nullability.NULL
    };

    static fromPragma(pragma: CoralPragma, rawContent: string): Contract | undefined {
        
        // 1. Try to parse as a Predicate Contract (e.g., "ensures return == (p != NULL)")
        const predicateMatch = rawContent.match(/ensures\s+return\s*==\s*\(\s*([a-zA-Z0-9_]+)\s*(!=|==)\s*NULL\s*\)/);
        if (predicateMatch) {
            return {
                target: "return",
                predicate: {
                    targetParam: predicateMatch[1],
                    isEq: predicateMatch[2] === "=="
                }
            };
        }

        // 2. Try to parse a Return State Contract (e.g., "ensures return: not-null")
        const returnStateMatch = rawContent.match(/ensures\s+return\s*:\s*(not-null|null|maybe-null)/);
        if (returnStateMatch) {
            return {
                target: "return",
                exitState: this.stateMap[returnStateMatch[1]]
            };
        }

        // 3. Try to parse a Global Variable Contract (e.g., "global global_ptr: unchanged")
        const globalMatch = rawContent.match(/global\s+([a-zA-Z0-9_]+)\s*:\s*(not-null|null|maybe-null|unchanged)/);
        if (globalMatch) {
            const target = globalMatch[1];
            const stateStr = globalMatch[2];
            
            if (stateStr === "unchanged") {
                return { target: target, unchanged: true, isGlobal: true };
            } else {
                return { target: target, exitState: this.stateMap[stateStr], isGlobal: true };
            }
        }

        // --- NEW: 4. Try to parse a Parameter Contract (e.g., "ptr: unchanged") ---
        const parameterMatch = rawContent.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*(not-null|null|maybe-null|unchanged)/);
        if (parameterMatch) {
            const target = parameterMatch[1];
            const stateStr = parameterMatch[2];
            
            if (stateStr === "unchanged") {
                // Notice there is NO isGlobal flag here!
                return { target: target, unchanged: true }; 
            } else {
                return { target: target, exitState: this.stateMap[stateStr] };
            }
        }

        // 5. Fallback to existing Transition Data (e.g., "p: not-null -> null")
        const data = pragma.transitionData;
        
        if (!data) return undefined;

        const entryState = this.stateMap[data.entryPart];
        const exitState = this.stateMap[data.exitPart];

        if (!entryState && !exitState) return undefined;

        return {
            target: data.target,
            entryState: entryState,
            exitState: exitState
        };
    }
}
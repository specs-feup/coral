import CoralPragma from "./CoralPragma.js";
import { Contract, Nullability, FieldContract } from "../symbol/Nullability.js";

export class ContractFactory {
    private static stateMap: Record<string, Nullability> = {
        "not-null": Nullability.NOT_NULL,
        "maybe-null": Nullability.MAYBE_NULL,
        "null": Nullability.NULL
    };

    // Helper method to parse strings like "not-null -> null" or "unchanged"
    private static parseTransition(flowStr: string): FieldContract {
        const flow = flowStr.split('->').map(s => s.trim());
        if (flow.length === 1) {
            if (flow[0] === "unchanged") return { unchanged: true };
            return { exitState: this.stateMap[flow[0]] };
        }
        return {
            entryState: this.stateMap[flow[0]],
            exitState: this.stateMap[flow[1]]
        };
    }

    static fromPragma(pragma: CoralPragma, rawContent: string): Contract | undefined {
        // Strip the "coral" keyword to standardize the string
        const contentToParse = rawContent.trim().replace(/^coral\s+/, '');

        // 1. Try to parse as a Predicate Contract
        const predicateMatch = contentToParse.match(/ensures\s+return\s*==\s*\(\s*([a-zA-Z0-9_]+)\s*(!=|==)\s*NULL\s*\)/);
        if (predicateMatch) {
            return {
                target: "return",
                predicate: { targetParam: predicateMatch[1], isEq: predicateMatch[2] === "==" }
            };
        }

        // 2. Try to parse a Return State Contract
        const returnStateMatch = contentToParse.match(/ensures\s+return\s*:\s*(not-null|null|maybe-null)/);
        if (returnStateMatch) {
            return { target: "return", exitState: this.stateMap[returnStateMatch[1]] };
        }

        // 3. Try to parse a Global Variable Contract
        const globalMatch = contentToParse.match(/global\s+([a-zA-Z0-9_]+)\s*:\s*(not-null|null|maybe-null|unchanged)/);
        if (globalMatch) {
            const target = globalMatch[1];
            const stateStr = globalMatch[2];
            return stateStr === "unchanged" 
                ? { target, unchanged: true, isGlobal: true }
                : { target, exitState: this.stateMap[stateStr], isGlobal: true };
        }

        // --- NEW: 4. Unified Parameter & Struct Contract Parser ---
        // Matches combinations of: target {fields} : transition
        // e.g., "b {data: not-null -> null} : not-null -> not-null"
        const paramMatch = contentToParse.match(/^([a-zA-Z0-9_]+)(?:\s*\{([^}]+)\})?(?:\s*:\s*(.+))?$/);
        
        if (paramMatch && paramMatch[1] !== "ensures" && paramMatch[1] !== "global") {
            const target = paramMatch[1];
            const fieldsStr = paramMatch[2];         // e.g., "data: not-null -> null"
            const mainTransitionStr = paramMatch[3]; // e.g., "not-null -> not-null"

            const contract: Contract = { target };

            // Parse struct fields if they exist
            if (fieldsStr) {
                contract.fields = {};
                // Split by comma to support multiple fields: {data: null, size: not-null}
                const fieldDeclarations = fieldsStr.split(',');
                for (const decl of fieldDeclarations) {
                    const fieldParts = decl.split(':');
                    if (fieldParts.length === 2) {
                        const fieldName = fieldParts[0].trim();
                        contract.fields[fieldName] = this.parseTransition(fieldParts[1]);
                    }
                }
            }

            // Parse main variable transition if it exists
            if (mainTransitionStr) {
                Object.assign(contract, this.parseTransition(mainTransitionStr));
            } else if (!fieldsStr) {
                // If there's neither a field block nor a transition, it's invalid
                return undefined;
            }

            return contract;
        }

        return undefined;
    }
}
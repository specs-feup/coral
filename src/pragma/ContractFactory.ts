import { Contract, Nullability, FieldContract } from "../symbol/Nullability.js";
import CoralPragma from "./CoralPragma.js";

export class ContractFactory {
    private static stateMap: Record<string, Nullability> = {
        "not-null": Nullability.NOT_NULL,
        "maybe-null": Nullability.MAYBE_NULL,
        "null": Nullability.NULL
    };

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

    static fromPragma(pragma: CoralPragma): Contract | undefined {
        const rawContent = pragma.rawContent;
        console.log("here", rawContent)
        // 1. Enforce the "null" namespace constraint
        if (pragma.name !== "null") {
            return undefined; // Not a nullability pragma, ignore it.
        }

        // Strip "coral null" to standardise the string for parsing
        const contentToParse = rawContent.replace(/^null\s+/, '').trim();

        // 2. Predicate Contract
        const predicateMatch = contentToParse.match(/ensures\s+return\s*==\s*\(\s*([a-zA-Z0-9_]+)\s*(!=|==)\s*NULL\s*\)/);
        if (predicateMatch) {
            return {
                target: "return",
                predicate: { targetParam: predicateMatch[1], isEq: predicateMatch[2] === "==" }
            };
        }

        // 3. Return State Contract
        const returnStateMatch = contentToParse.match(/ensures\s+return\s*:\s*(not-null|null|maybe-null)/);
        if (returnStateMatch) {
            return { target: "return", exitState: this.stateMap[returnStateMatch[1]] };
        }

        // 4. Global Variable Contract
        const globalMatch = contentToParse.match(/global\s+([a-zA-Z0-9_]+)\s*:\s*(not-null|null|maybe-null|unchanged)/);
        if (globalMatch) {
            const target = globalMatch[1];
            const stateStr = globalMatch[2];
            return stateStr === "unchanged"
                ? { target, unchanged: true, isGlobal: true }
                : { target, exitState: this.stateMap[stateStr], isGlobal: true };
        }

        // 5. Unified Parameter & Struct Contract Parser
        // Notice the capture group 1: ([a-zA-Z0-9_]+|%\([^)]+\))
        // This explicitly allows standard variable names OR %(regex_pattern)
        // 7. Unified Parameter & Struct Contract Parser
        const paramMatch = contentToParse.match(/^([a-zA-Z0-9_]+|%\([^)]+\))(?:\s*\{([^}]+)\})?(?:\s*:\s*(.+))?$/);

        if (paramMatch && !contentToParse.startsWith("ensures") && !contentToParse.startsWith("global")) {
            
            let target = paramMatch[1];
            let isRegex = false;

            // --- NEW: Detect and unwrap the regex ---
            const regexExtract = target.match(/^%\((.*)\)$/);
            if (regexExtract) {
                target = regexExtract[1]; // Save just the inner pattern (e.g., ".*ptr.*")
                isRegex = true;           // Flag it!
            }

            // Create the base contract with the flag
            const contract: Contract = { target, isRegex };

            const fieldsStr = paramMatch[2];
            const mainTransitionStr = paramMatch[3];

            // ... (The rest of the field parsing remains exactly the same)
            if (fieldsStr) {
                console.log("here")
                contract.fields = {};
                const fieldDeclarations = fieldsStr.split(',');
                for (const decl of fieldDeclarations) {
                    const fieldParts = decl.split(':');
                    if (fieldParts.length === 2) {
                        const fieldName = fieldParts[0].trim();
                        contract.fields[fieldName] = this.parseTransition(fieldParts[1]);
                    }
                }
            }

            if (mainTransitionStr) {
                Object.assign(contract, this.parseTransition(mainTransitionStr));
            } else if (!fieldsStr) {
                return undefined;
            }

            return contract;
        }

        return undefined;
    }
}
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


        if (pragma.name !== "null") {
            return undefined;
        }


        const contentToParse = rawContent.replace(/^null\s+/, '').trim();


        const predicateMatch = contentToParse.match(/ensures\s+return\s*==\s*\(\s*([a-zA-Z0-9_]+)\s*(!=|==)\s*NULL\s*\)/);
        if (predicateMatch) {
            return {
                target: "return",
                predicate: { targetParam: predicateMatch[1], isEq: predicateMatch[2] === "==" }
            };
        }


        const returnStateMatch = contentToParse.match(/ensures\s+return\s*:\s*(not-null|null|maybe-null)/);
        if (returnStateMatch) {
            return { target: "return", exitState: this.stateMap[returnStateMatch[1]] };
        }


        const globalMatch = contentToParse.match(/global\s+([a-zA-Z0-9_]+)\s*:\s*(not-null|null|maybe-null|unchanged)/);
        if (globalMatch) {
            const target = globalMatch[1];
            const stateStr = globalMatch[2];
            return stateStr === "unchanged"
                ? { target, unchanged: true, isGlobal: true }
                : { target, exitState: this.stateMap[stateStr], isGlobal: true };
        }


        const paramMatch = contentToParse.match(/^([a-zA-Z0-9_]+|%\([^)]+\))(?:\s*\{([^}]+)\})?(?:\s*:\s*(.+))?$/);

        if (paramMatch && !contentToParse.startsWith("ensures") && !contentToParse.startsWith("global")) {

            let target = paramMatch[1];
            let isRegex = false;


            const regexExtract = target.match(/^%\((.*)\)$/);
            if (regexExtract) {
                target = regexExtract[1];
                isRegex = true;
            }


            const contract: Contract = { target, isRegex };

            const fieldsStr = paramMatch[2];
            const mainTransitionStr = paramMatch[3];


            if (fieldsStr) {
              
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
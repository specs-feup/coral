import CoralPragma from "./CoralPragma.js";
import { Contract, Nullability } from "../symbol/Nullability.js";

export class ContractFactory {
    private static stateMap: Record<string, Nullability> = {
        "not-null": Nullability.NOT_NULL,
        "maybe-null": Nullability.MAYBE_NULL,
        "null": Nullability.NULL
    };

    static fromPragma(pragma: CoralPragma): Contract | undefined {
        const data = pragma.transitionData;
        
        // If it doesn't have a ':', it's not a Nullability Contract
        if (!data) return undefined;

        const entryState = this.stateMap[data.entryPart];
        const exitState = this.stateMap[data.exitPart];

        // Ensure at least one state was successfully mapped
        if (!entryState && !exitState) return undefined;

        return {
            target: data.target,
            entryState: entryState,
            exitState: exitState
        };
    }
}
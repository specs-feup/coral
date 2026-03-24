// src/pragma/ContractFactory.ts
import CoralPragma from "./CoralPragma.js";

export enum Nullability {
    NOT_NULL = "NOT_NULL",
    MAYBE_NULL = "MAYBE_NULL",
    NULL = "NULL"
}

export interface Contract {
    state: Nullability;
    isFinal: boolean;
    target: string;
}

export class ContractFactory {
    static fromPragma(pragma: CoralPragma): Contract | undefined {
        const stateMap: Record<string, Nullability> = {
            "not-null": Nullability.NOT_NULL,
            "maybe-null": Nullability.MAYBE_NULL,
            "null": Nullability.NULL
        };

        const state = stateMap[pragma.name];
        if (!state) return undefined; 
      
         console.log(`[Factory] Gerado Contrato: ${state} para o alvo: ${pragma.target} (Final: ${pragma.hasFinal})`);

       
        return {
            state,
            isFinal: pragma.hasFinal, 
            target: pragma.target 
        };
    }
}
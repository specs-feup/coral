import { FunctionJp, Pragma, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import { NormalizationPass, NormalizationContext } from "../CoralNormalizer.js";
import {  Contract } from "../../symbol/Nullability.js";
import { ContractFactory } from "@specs-feup/coral/pragma/ContractFactory";
import CoralPragma from "../../pragma/CoralPragma.js";

export default class ExtractContracts implements NormalizationPass<typeof Pragma> {
    get query() {
        return { 
            jp: Pragma, 
            filter: ($p: Pragma) => $p.name === "coral" 
        };
    }

    apply($pragma: Pragma, context: NormalizationContext): void {
        const $target = $pragma.target;
    
        if ($target instanceof FunctionJp) {
            const coralPragma = new CoralPragma($pragma);
            const contract = ContractFactory.fromPragma(coralPragma);
    
            if (contract) {
                const raw = $target.getUserField("coralContracts") as unknown as string | undefined;
                const existingContracts: any[] = raw ? JSON.parse(raw) : [];

                existingContracts.push({
                    state: contract.state,
                    target: contract.target,
                    isFinal: contract.isFinal
                });
                const jsonToSave = JSON.stringify(existingContracts);
                $target.setUserField("coralContracts", jsonToSave as unknown as object);
            
                console.log(`[Extract] Contrato '${contract.state}' para '${contract.target}' guardado.`);
            }
        }
    }
}
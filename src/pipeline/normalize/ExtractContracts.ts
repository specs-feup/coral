// src/pipeline/normalize/ExtractContracts.ts
import { NormalizationPass, NormalizationContext } from "../CoralNormalizer.js";
import { Pragma, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import CoralPragma from "../../pragma/CoralPragma.js";
import { ContractFactory } from "../../pragma/ContractFactory.js";

export default class ExtractContracts implements NormalizationPass<typeof Pragma> {
    get query() { 
        return { jp: Pragma, filter: { name: "coral" } }; 
    }

    apply($pragma: Pragma, context: NormalizationContext): void {
        const coralPragma = new CoralPragma($pragma);
        const contract = ContractFactory.fromPragma(coralPragma);

        if (contract) {
          
            let $current: Joinpoint | undefined = $pragma.target;
            

            while ($current && !$current.instanceOf("function") && !$current.instanceOf("scope")) {
                $current = $current.parent;
            }

            if ($current) {
          
                const contracts = ($current.data as any).coralContracts ?? [];
                contracts.push(contract);
                ($current.data as any).coralContracts = contracts;
                
        
                console.log(`[Coral] Contrato '${contract.state}' para '${contract.target}' anexado a ${$current.joinPointType}`);
                console.log(`[Pass] SUCESSO: Contrato anexado ao Joinpoint do tipo: ${$current.joinPointType}`);
                if ($current.instanceOf("function")) {
                    console.log(`       Nome da Função: ${($current as any).name}`);
                }
            }
        }
    }
}
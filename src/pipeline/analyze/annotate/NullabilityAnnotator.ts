import CoralFunctionWiseTransformation, {
    CoralFunctionWiseTransformationApplier,
} from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import { Contract, Nullability } from "@specs-feup/coral/symbol/Nullability";

export default class NullabilityAnnotator extends CoralFunctionWiseTransformation {
    fnApplier = NullabilityAnnotatorApplier;
}

class NullabilityAnnotatorApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        console.log("ola")
        const fnSymbol = this.fn.getSymbol(this.fn.jp);
        console.log(fnSymbol)

        let contracts: Contract[] = [];
        const raw = this.fn.jp.getUserField("coralContracts") as unknown as string | undefined;
        
        if (raw) {
            contracts = JSON.parse(raw) as Contract[];
        }
        
        console.log("[NullabilityAnnotator] Contracts found:", contracts);

        // 1. Handle Return Contracts
        const returnContract = contracts.find(c => c.target === "return");
        if (returnContract) {
            if (returnContract.exitState) {
                fnSymbol.returnNullability = returnContract.exitState;
            }
            // --- ADDED THIS BLOCK ---
            if (returnContract.predicate) {
                fnSymbol.returnPredicate = returnContract.predicate;
                console.log(`[NullabilityAnnotator] Found return predicate targeting '${returnContract.predicate.targetParam}'`);
            }
        }

        // 2. Handle Parameter Contracts
        for (const param of fnSymbol.params) {
            const mirName = param.jp.name; 
            
            console.log(`[NullabilityAnnotator] Checking MIR parameter: "${mirName}"`);

            const paramContract = contracts.find(c => c.target.trim() === mirName.trim());
            
            if (paramContract) {
                console.log(`[NullabilityAnnotator] MATCH FOUND for ${mirName}! Applying states...`);

                if(paramContract.unchanged){
                    param.isReadOnly = true
                }
                
                if (paramContract.entryState) {
                    param.initialNullability = paramContract.entryState;
                }
                
                if (paramContract.exitState) {
                    param.finalNullability = paramContract.exitState;
                }
            } else {
                console.log(`[NullabilityAnnotator] No contract found for "${mirName}" in:`, contracts.map(c => c.target));
            }

            console.log(`[NullabilityAnnotator] Result for ${mirName}: Initial=${param.initialNullability}, Final=${param.finalNullability}`);
        }
    }
}
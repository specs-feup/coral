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
// Inside NullabilityAnnotatorApplier.apply() -> Parameter handling loop:

                if (paramContract.fields) {
                    for (const [key, fieldStates] of Object.entries(paramContract.fields)) {
                        console.log(key, fieldStates)
                        const cleanKey = key.trim();

                        // Check if the key consists entirely of asterisks (e.g., "*", "**")
                        if (/^\*+$/.test(cleanKey)) {
                            const level = cleanKey.length; // '*' = 1, '**' = 2
                            console.log(level)
                            
                            param.indirectionNullability = param.indirectionNullability || {};
                            param.indirectionNullability[level] = {
                                initialNullability: fieldStates.entryState,
                                finalNullability: fieldStates.exitState
                            };
                            console.log(`[NullabilityAnnotator] Applied states for pointer level ${level} on ${mirName}`);
                        } else {
                            // It's a standard struct field (e.g., "data")
                            console.log("level")
                            param.fieldsNullability = param.fieldsNullability || {};
                            param.fieldsNullability[cleanKey] = {
                                initialNullability: fieldStates.entryState,
                                finalNullability: fieldStates.exitState
                            };
                            console.log(`[NullabilityAnnotator] Applied states for struct field: ${mirName}.${cleanKey}`);
                        }
                    }
                }
            } else {
                console.log(`[NullabilityAnnotator] No contract found for "${mirName}" in:`, contracts.map(c => c.target));
            }

            console.log(`[NullabilityAnnotator] Result for ${mirName}: Initial=${param.initialNullability}, Final=${param.finalNullability}`);
        }
    }
}
import CoralFunctionWiseTransformation, {
    CoralFunctionWiseTransformationApplier,
} from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import { Contract, Nullability } from "@specs-feup/coral/symbol/Nullability";

export default class NullabilityAnnotator extends CoralFunctionWiseTransformation {
    fnApplier = NullabilityAnnotatorApplier;
}

class NullabilityAnnotatorApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        const fnSymbol = this.fn.getSymbol(this.fn.jp);
        let contracts: Contract[] = [];
        const raw = this.fn.jp.getUserField("coralContracts") as unknown as string | undefined;
        
        if (raw) {
            contracts = JSON.parse(raw) as Contract[];
        }

        fnSymbol.globalContracts = {};
        fnSymbol.compiledParamContracts = [];

        // 1. Handle Global Contracts
        for (const contract of contracts) {

            if (!contract.isGlobal && contract.target !== "return") {
                
                if (contract.isRegex) {
                    fnSymbol.compiledParamContracts.push({
                        ...contract,
                        compiledRegex: new RegExp(contract.target) 
                    });
                } else {
                    fnSymbol.compiledParamContracts.push(contract);
                }
            }
            else if (contract.isGlobal) {
                fnSymbol.globalContracts[contract.target] = {
                    unchanged: contract.unchanged,
                    exitState: contract.exitState,
                    target: contract.target
                };
                console.log(`[NullabilityAnnotator] Applied global contract to: ${contract.target}`);
            }
        }

       


        // 1. Handle Return Contracts
        const returnContract = contracts.find(c => c.target === "return");
        if (returnContract) {
            if (returnContract.exitState) {
                fnSymbol.returnNullability = returnContract.exitState;
            }
            if (returnContract.predicate) {
                fnSymbol.returnPredicate = returnContract.predicate;
            }
        }

        // 2. Handle Parameter Contracts
        for (const param of fnSymbol.params) {
            const mirName = param.jp.name.trim(); 
            
           
            const paramContract = contracts.find(c => {
                const target = c.target.trim();
                
                if (c.isRegex) {
                    const regex = new RegExp(target);
                    return regex.test(mirName);
                }
                
                return target === mirName;
            });

            
            if (paramContract) {
            

                if(paramContract.unchanged){
                    param.isReadOnly = true;
                }
                if (paramContract.entryState) {
                    param.initialNullability = paramContract.entryState;
                }
                if (paramContract.exitState) {
                    param.finalNullability = paramContract.exitState;
                }

                if (paramContract.fields) {
                    for (const [key, fieldStates] of Object.entries(paramContract.fields)) {
                        const cleanKey = key.trim();

                        if (/^\*+$/.test(cleanKey)) {
                            const level = cleanKey.length; 
                            param.indirectionNullability = param.indirectionNullability || {};
                            param.indirectionNullability[level] = {
                                initialNullability: fieldStates.entryState,
                                finalNullability: fieldStates.exitState
                            };
                        } else {
                            param.fieldsNullability = param.fieldsNullability || {};
                            param.fieldsNullability[cleanKey] = {
                                initialNullability: fieldStates.entryState,
                                finalNullability: fieldStates.exitState
                            };
                        }
                    }
                }
            }
        }
    }
}
import CoralFunctionWiseTransformation, {
    CoralFunctionWiseTransformationApplier,
} from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import Region from "@specs-feup/coral/mir/symbol/Region";
import InferRegionBounds from "@specs-feup/coral/pipeline/analyze/regionck/InferRegionBounds";
import { Contract, Nullability } from "@specs-feup/coral/symbol/Nullability";
export default class SignatureAnnotator extends CoralFunctionWiseTransformation {
    fnApplier = SignatureAnnotatorApplier;
}

class SignatureAnnotatorApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        const fnSymbol = this.fn.getSymbol(this.fn.jp);

        const regionVars = new Map<string, Region>();
        regionVars.set("%static", this.fn.staticRegion);
        for (const metaRegion of fnSymbol.metaRegions) {
            if (!regionVars.has(metaRegion.name)) {
                const region = this.fn.addRegion(metaRegion.name, Region.Kind.UNIVERSAL);
                regionVars.set(metaRegion.name, region);
            }
        }

        let contracts: Contract[] = [];
        const raw = this.fn.jp.getUserField("coralContracts") as unknown as string | undefined;
        if (raw) {
            contracts = JSON.parse(raw) as Contract[];
        }
        
        console.log("[Annotator] Contracts found:", contracts);

        this.fn.returnTy = fnSymbol.return.toTy(regionVars);
        const returnContract = contracts.find(c => c.target === "return");
        if (returnContract?.exitState) {
            fnSymbol.returnNullability = returnContract.exitState;
        }

        for (const param of fnSymbol.params) {
            const mirName = param.jp.name; 
            
            console.log(`[Annotator] Checking MIR parameter: "${mirName}"`);

            const paramContract = contracts.find(c => c.target.trim() === mirName.trim());
            
            if (paramContract) {
                console.log(`[Annotator] MATCH FOUND for ${mirName}! Applying states...`);
                
                if (paramContract.entryState) {
                    param.initialNullability = paramContract.entryState;
                }
                
                if (paramContract.exitState) {
                    param.finalNullability = paramContract.exitState;
                }
            } else {
                console.log(`[Annotator] No contract found for "${mirName}" in:`, contracts.map(c => c.target));
            }

            const ty = param.ty.toTy(regionVars);
            this.fn.registerSymbol(param.jp, ty); 
            
            console.log(`[Annotator] Result for ${mirName}: Initial=${param.initialNullability}, Final=${param.finalNullability}`);
        }

        if (!fnSymbol.hasLifetimePragmas) {
            this.fn.inferRegionBoundsState = InferRegionBounds.FunctionState.NOT_VISITED;
        }
    }
}

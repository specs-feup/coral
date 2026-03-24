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

        this.fn.returnTy = fnSymbol.return.toTy(regionVars);
        const returnContract = contracts.find(c => c.target === "return");
        if (returnContract) {
            fnSymbol.returnNullability = returnContract.state;
        }

        for (const param of fnSymbol.params) {
            const paramContracts = contracts.filter(c => c.target === param.jp.name);
            for (const contract of paramContracts) {
                if (contract.isFinal) {
                    param.finalNullability = contract.state;
                } else {
                    param.initialNullability = contract.state;
                }
            }
            const ty = param.ty.toTy(regionVars);
            this.fn.registerSymbol(param.jp, ty); 

        }

        if (!fnSymbol.hasLifetimePragmas) {
            this.fn.inferRegionBoundsState = InferRegionBounds.FunctionState.NOT_VISITED;
        }

    }
}

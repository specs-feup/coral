import CoralFunctionWiseTransformation, {
    CoralFunctionWiseTransformationApplier,
} from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import Region from "@specs-feup/coral/mir/symbol/Region";
import InferRegionBounds from "@specs-feup/coral/pipeline/analyze/regionck/InferRegionBounds";

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

        // Inference is only done if there are no explicit pragmas
        if (!fnSymbol.hasLifetimePragmas) {
            this.fn.inferRegionBoundsState = InferRegionBounds.FunctionState.NOT_VISITED;
        }

        this.fn.returnTy = fnSymbol.return.toTy(regionVars);
        for (const param of fnSymbol.params) {
            this.fn.registerSymbol(param.jp, param.ty.toTy(regionVars));
        }
    }
}

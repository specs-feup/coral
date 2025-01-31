import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";

export default class AddLifetimePragmas extends CoralFunctionWiseTransformation {
    fnApplier = AddLifetimePragmasApplier;
}

class AddLifetimePragmasApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        
    }
}

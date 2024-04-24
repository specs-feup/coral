import Ty from "coral/mir/ty/Ty";


interface MetaTy {
    semantics: Ty.Semantics;
    isConst: boolean;
    toTy(): Ty;
}

export default MetaTy;

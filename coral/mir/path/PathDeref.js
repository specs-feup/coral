laraImport("coral.mir.path.Path");
laraImport("coral.mir.path.PathKind");
laraImport("coral.ty.Ty");
laraImport("coral.borrowck.Regionck");

class PathDeref extends Path {
   
    constructor($jp, inner) {
        super($jp, inner);
    }

    /**
     * @returns {PathKind}
     */
    get kind() {
        return PathKind.DEREF;
    }

    /** 
     * @returns {string}
     */
    toString() {
        return "(*" + this.inner.toString() + ")";
    }

    /**
     * @param {Regionck} regionck
     * @returns {Ty}
     */
    retrieveTy(regionck) {
        const inner_ty = this.inner.retrieveTy(regionck);
        if (!(inner_ty instanceof RefTy))
            throw new Error("Cannot dereference non-reference type " + inner_ty.toString());
        return inner_ty.referent;
    }
}
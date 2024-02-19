laraImport("coral.mir.path.Path");
laraImport("coral.mir.path.PathKind");
laraImport("coral.ty.Ty");
laraImport("coral.ty.RefTy");
laraImport("coral.ty.BorrowKind");
laraImport("coral.regionck.Regionck");

class PathDeref extends Path {
   
    /**
     * @type {BorrowKind}
     */
    borrowKind;

    regionvar;

    /**
     * 
     * @param {JoinPoint} $jp 
     * @param {Path} inner 
     * @param {BorrowKind} borrowKind 
     */
    constructor($jp, inner, borrowKind, regionvar) {
        super($jp, inner);

        this.borrowKind = borrowKind;
        this.regionvar = regionvar;
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
     * @param {PathDeref} other
     * @returns {boolean}
     */
    equals(other) {
        return this.kind === other.kind && this.inner.equals(other.inner);
    }
    
    /**
     * @return {Path[]}
     */
    prefixes() {
        return [this, ...this.inner.prefixes()];
    }

    /**
     * @returns {Path[]}
     */
    shallowPrefixes() {
        return [this];
    }

    /**
     * @returns {Path[]}
     */
    supportingPrefixes() {
        return this.borrowKind === BorrowKind.MUTABLE ? [this, ...this.inner.supportingPrefixes() ] : [this];
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
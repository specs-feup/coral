laraImport("coral.mir.path.Path");
laraImport("coral.mir.path.PathKind");
laraImport("coral.ty.Ty");
laraImport("coral.regionck.Regionck");

class PathMemberAccess extends Path {
    
    constructor($jp, inner) {
        super($jp, inner);
    }

    /**
     * @returns {PathKind}
     */
    get kind() {
        return PathKind.MEMBER_ACCESS;
    }

    /**
     * @returns {string}
     */
    toString() {
        throw new Error("PathMemberAccess toString() not implemented");
    }

    /**
     * @param {Path} other
     * @returns {boolean}
     */
    equals(other) {
        throw new Error("PathMemberAccess equals() not implemented");
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
        return [this, ...this.inner.shallowPrefixes()];
    }

    /**
     * @returns {Path[]}
     */
    supportingPrefixes() {
        [this, ...this.inner.supportingPrefixes()]
    }

    /**
     * @param {Regionck} regionck
     * @returns {Ty}
     */
    retrieveTy(regionck) {
        throw new Error("TODO: PathMemberAccess retrieveTy() not implemented");
    }
}
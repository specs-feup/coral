laraImport("coral.mir.path.Path");
laraImport("coral.mir.path.PathKind");
laraImport("coral.ty.Ty");
laraImport("coral.borrowck.Regionck");

class PathVarRef extends Path {

    constructor($jp, inner) {
        super($jp, inner);
    }

    /**
     * @returns {PathKind}
     */
    get kind() {
        return PathKind.VARREF;
    }

    /**
     * @returns {string}
     */
    toString() {
        return this.$jp.name;
    }

    /**
     * @param {Regionck} regionck
     * @returns {Ty}
     */
    retrieveTy(regionck) {
        return regionck.declarations.get(this.$jp.name);
    }
}
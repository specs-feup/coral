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
    get name() {
        return this.$jp.name;
    }

    /**
     * @returns {string}
     */
    toString() {
        return this.$jp.name;
    }

    /**
     * @param {PathVarRef} other
     * @returns {boolean}
     */
    equals(other) {
        return this.kind === other.kind && this.name === other.name;
    }
    
    /**
     * @return {Path[]}
     */
    prefixes() {
        return [this];
    }

    /**
     * @param {Regionck} regionck
     * @returns {Ty}
     */
    retrieveTy(regionck) {
        return regionck.declarations.get(this.$jp.name);
    }
}
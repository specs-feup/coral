laraImport("coral.mir.path.PathKind");
laraImport("coral.mir.ty.Ty");
laraImport("coral.regionck.Regionck");

/**
 * @abstract
 */
class Path {

    /**
     * @param {Path | undefined} inner
     */
    inner;

    /**
     * @param {JoinPoint} $jp
     */
    $jp;

    constructor($jp, inner) {
        this.$jp = $jp;
        this.inner = inner;
    }

    /**
     * @returns {PathKind}
     */
    get kind() {}

    /**
     * @returns {string}
     */
    toString() {}

    /**
     * @param {Path} other
     * @returns {boolean}
     */
    equals(other) {}

    /**
     * @return {Path[]}
     */
    prefixes() {}

    /**
     * @returns {Path[]}
     */
    shallowPrefixes() {}

    /**
     * @returns {Path[]}
     */
    supportingPrefixes() {}

    /**
     * @param {Regionck} regionck
     * @returns {Ty}
     */
    retrieveTy(regionck) {}
}
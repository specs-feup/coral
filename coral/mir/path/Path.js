laraImport("coral.mir.path.PathKind");
laraImport("coral.ty.Ty");
laraImport("coral.borrowck.Regionck");

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

    get kind() {}

    toString() {}

    /**
     * @param {Regionck} regionck
     * @returns {Ty}
     */
    retrieveTy(regionck) {}
}
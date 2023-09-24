laraImport("coral.mir.path.PathKind");

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
}
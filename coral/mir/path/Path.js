import PathKind from "./PathKind.js";
import Ty from "../../ty/Ty.js";
import Regionck from "../../borrowck/Regionck.js";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

/**
 * @abstract
 */
export default class Path {

    /**
     * @param {Path | undefined} inner
     */
    inner;

    /**
     * @param {Joinpoint} $jp
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
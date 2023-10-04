import Path from "./Path.js";
import PathKind from "./PathKind.js";
import Ty from "../ty/Ty.js";
import Regionck from "../borrowck/Regionck.js";

export default class PathVarRef extends Path {

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
     * @returns {Path[]}
     */
    shallowPrefixes() {
        return [this];
    }

    /**
     * @returns {Path[]}
     */
    supportingPrefixes() {
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
laraImport("coral.regionck.RegionVariable");

/**
 * @abstract
 */
class Ty {

    /**
     * @type {string}
     */
    name;

    /**
     * @type {RegionVariable[]}
     */
    lifetimes;

    /**
     * @type {boolean}
     */
    isConst;

    /**
     * @type {boolean}
     */
    isCopyable;

    /**
     * 
     * @param {string} name 
     * @param {boolean} copyable 
     * @param {boolean} isConst 
     * @param {RegionVariable[]} lifetimes 
     */
    constructor(name, copyable, isConst, lifetimes) {
        this.name = name;
        this.isCopyable = copyable;
        this.isConst = isConst;
        this.lifetimes = lifetimes;
    }

    /**
     * 
     * @param {Ty} other 
     */
    equals(other) {}

    /**
     * @returns {string}
     */
    toString() {}

    /**
     * @returns {RegionVariable[]}
     */
    nestedLifetimes() {
        return this.lifetimes;
    }

    /**
     * @returns {boolean}
     */
    get requiresLifetimes() {
        return this.lifetimes.size > 0;
    }
}

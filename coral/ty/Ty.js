/**
 * @abstract
 */
class Ty {

    name;
    lifetimes;
    isConst;
    isCopyable;

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
     * @returns string
     */
    toString() {}

    get requiresLifetimes() {
        return this.lifetimes.size > 0;
    }
}

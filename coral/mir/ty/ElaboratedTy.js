laraImport("coral.mir.ty.Ty");

class ElaboratedTy extends Ty {

    /**
     * struct, enum, etc
     */
    kind;

    /**
     * @type {Map<string, Ty>}
     */
    fields;


    /**
     * 
     * @param {string} name 
     * @param {boolean} copyable 
     * @param {boolean} isConst 
     * @param {RegionVariable[]} lifetimes 
     */
    constructor(name, copyable, isConst = false, lifetimes = []) {
        super(name, copyable, isConst, lifetimes);

    }

    /**
     * 
     * @param {ElaboratedTy} other 
     * @returns {boolean}
     */
    equals(other) {
        return other instanceof ElaboratedTy &&
            this.name === other.name &&
            this.isConst === other.isConst &&
            this.lifetimes.equals(other.lifetimes);
    }

    /**
     * 
     * @returns {string}
     */
    toString() {
        return this.name + this.requiresLifetimes ? "<" + this.lifetimes.join(", ") + ">" : "";
    }

}
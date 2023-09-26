laraImport("coral.ty.Ty");

class BuiltinTy extends Ty {

    constructor(name, isConst=false) {
        super(name, true, isConst, []);
    }

    /**
     * 
     * @param {BuiltinTy} other 
     * @returns 
     */
    equals(other) {
        return other instanceof BuiltinTy && this.name === other.name && this.isConst === other.isConst;
    }
    
    /**
     * 
     * @returns {string}
     */
    toString() {
        return this.name;
    }

    /**
     * @returns {boolean}
     */
    get requiresLifetimes() {
        return false;
    }
}

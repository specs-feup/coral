laraImport("coral.ty.Ty");

class BuiltinTy extends Ty {

    constructor(name, isConst=false) {
        super(name, true, isConst, []);
    }

    equals(other) {
        return other instanceof BuiltinTy && this.name === other.name && this.isConst === other.isConst;
    }

    toString() {
        return this.name;
    }

    get requiresLifetimes() {
        return false;
    }
}

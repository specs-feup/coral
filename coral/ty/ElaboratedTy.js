laraImport("coral.ty.Ty");

class ElaboratedTy extends Ty {

    /**
     * struct, enum, etc
     */
    kind;

    // Do I really want it like this?
    /**
     * @type {Map<string, Ty>}
     */
    fields;

    constructor(name, copyable, isConst = false, lifetimes = []) {
        super(name, copyable, isConst, lifetimes);

    }

    equals(other) {
        return other instanceof ElaboratedTy &&
            this.name === other.name &&
            this.isConst === other.isConst &&
            this.lifetimes.equals(other.lifetimes);
    }

    toString() {
        return this.name + this.requiresLifetimes ? "<" + this.lifetimes.join(", ") + ">" : "";
    }

}
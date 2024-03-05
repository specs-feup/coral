import Ty from "./Ty.js";

export default class BuiltinTy extends Ty {
    constructor(name: string, isConst: boolean = false) {
        super(name, true, isConst, []);
    }

    override equals(other: BuiltinTy) {
        return (
            other instanceof BuiltinTy &&
            this.name === other.name &&
            this.isConst === other.isConst
        );
    }

    override toString(): string {
        return this.name;
    }

    override get requiresLifetimes(): boolean {
        return false;
    }
}

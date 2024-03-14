import Ty from "coral/mir/ty/Ty";
import RegionVariable from "coral/regionck/RegionVariable";

export default class BuiltinTy extends Ty {
    override name: string;
    override isConst: boolean;

    constructor(name: string, isConst: boolean = false) {
        super();
        this.name = name;
        this.isConst = isConst;
    }

    get regionVars(): RegionVariable[] {
        return []
    }

    get semantics(): Ty.Semantics {
        return Ty.Semantics.COPY;
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
}

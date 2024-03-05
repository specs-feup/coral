import Ty from "coral/mir/ty/Ty";
import RegionVariable from "coral/regionck/RegionVariable";

export default class ElaboratedTy extends Ty {
    constructor(
        name: string,
        copyable: boolean,
        isConst: boolean = false,
        lifetimes: RegionVariable[] = [],
    ) {
        super(name, copyable, isConst, lifetimes);
    }

    override equals(other: ElaboratedTy): boolean {
        return (
            other instanceof ElaboratedTy &&
            this.name === other.name &&
            this.isConst === other.isConst
        );
        // && this.lifetimes.equals(other.lifetimes); TODO is this needed?
    }

    override toString(): string {
        return this.name + this.requiresLifetimes
            ? "<" + this.lifetimes.join(", ") + ">"
            : "";
    }
}

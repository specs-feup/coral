import Ty from "coral/mir/ty/Ty";
import RegionVariable from "coral/regionck/RegionVariable";


// TODO
export default class ElaboratedTy extends Ty {
    override name: string;
    override regionVars: RegionVariable[];
    override isConst: boolean;
    override semantics: Ty.Semantics;

    constructor(
        name: string,
        semantics: Ty.Semantics,
        isConst: boolean = false,
        lifetimes: RegionVariable[] = [],
    ) {
        super();
        this.name = name;
        this.isConst = isConst;
        this.regionVars = lifetimes;
        this.semantics = semantics; // TODO try to infer this from inner types
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
        if (this.requiresLifetimes) {
            return `${this.name}<${this.regionVars.join(", ")}>`;
        } else {
            return this.name;
        }
    }
}

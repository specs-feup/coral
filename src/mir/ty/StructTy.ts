import { RecordJp } from "clava-js/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";
import RegionVariable from "coral/regionck/RegionVariable";

// TODO nestedRegionVars?
export default class StructTy extends Ty {
    override regionVars: RegionVariable[];
    override isConst: boolean;
    override semantics: Ty.Semantics;
    override $jp: RecordJp;
    fields: Map<string, Ty>;

    constructor(
        $jp: RecordJp,
        fields: Map<string, Ty>,
        isConst: boolean = false,



        lifetimes: RegionVariable[] = [],
    ) {
        super();
        this.$jp = $jp;
        this.fields = fields;
        this.isConst = isConst;


        this.regionVars = lifetimes;
        this.semantics = Ty.Semantics.MOVE; // TODO try to infer this from inner types (no drop & all fields are copy)
    }

    override get name(): string {
        return `struct ${this.$jp.name}`;
    }

    override equals(other: StructTy): boolean {
        return (
            other instanceof StructTy &&
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

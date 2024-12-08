import { BuiltinType, EnumDecl } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/ty/Ty";
import MetaTy from "@specs-feup/coral/mir/ty/meta/MetaTy";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";

export default class BuiltinTy extends Ty implements MetaTy {
    override name: string;
    override isConst: boolean;
    override $jp: BuiltinType | EnumDecl;

    constructor(name: string, $jp: BuiltinType | EnumDecl, isConst: boolean = false) {
        super();
        this.name = name;
        this.isConst = isConst;
        this.$jp = $jp;
    }

    get regionVars(): RegionVariable[] {
        return [];
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

    toTy(): Ty {
        return this;
    }
}

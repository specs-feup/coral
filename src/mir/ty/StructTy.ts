import { FunctionJp, RecordJp } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/ty/Ty";
import MetaTy from "@specs-feup/coral/mir/ty/meta/MetaTy";
import StructDef from "@specs-feup/coral/mir/ty/meta/StructDef";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";

export default class StructTy extends Ty {
    def: StructDef;
    regionVarMap: Map<string, RegionVariable>;
    override isConst: boolean;

    constructor(
        def: StructDef,
        regionVarMap: Map<string, RegionVariable>,
        isConst: boolean = false,
    ) {
        super();
        this.def = def;
        this.regionVarMap = regionVarMap;
        this.isConst = isConst;
    }

    override get name(): string {
        return `struct ${this.$jp.name}`;
    }

    override get semantics(): Ty.Semantics {
        return this.def.semantics;
    }

    override get $jp(): RecordJp {
        return this.def.$jp;
    }

    override get regionVars(): RegionVariable[] {
        return Array.from(this.regionVarMap.values());
    }

    get isComplete(): boolean {
        return this.def.isComplete;
    }

    get fields(): Map<string, Ty> {
        const fields = new Map<string, Ty>();
        for (const [name, metaTy] of this.def.fields.entries()) {
            fields.set(name, metaTy.toTy(this.regionVarMap));
        }

        return fields;
    }

    get dropFunction(): FunctionJp | undefined {
        return this.def.dropFunction;
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
            return `${this.name}<${this.regionVars.map((r) => r.name).join(", ")}>`;
        } else {
            return this.name;
        }
    }
}

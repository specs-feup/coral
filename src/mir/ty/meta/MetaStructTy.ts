import { RecordJp } from "@specs-feup/clava/api/Joinpoints.js";
import StructTy from "@specs-feup/coral/mir/ty/StructTy";
import Ty from "@specs-feup/coral/mir/ty/Ty";
import MetaTy from "@specs-feup/coral/mir/ty/meta/MetaTy";
import MetaRegionVariable from "@specs-feup/coral/regionck/MetaRegionVariable";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";
import StructDefsMap from "@specs-feup/coral/regionck/StructDefsMap";

export default class MetaStructTy implements MetaTy {
    isConst: boolean;
    $jp: RecordJp;
    structDefs: StructDefsMap;

    // Maps a lifetime name to the MetaRegionVariable in the outer StructDef.
    regionVarMap: Map<string, MetaRegionVariable>;

    constructor(
        $jp: RecordJp,
        regionVarMap: Map<string, MetaRegionVariable>,
        structDefs: StructDefsMap,
        isConst: boolean = false,
    ) {
        this.$jp = $jp;
        this.regionVarMap = regionVarMap;
        this.structDefs = structDefs;
        this.isConst = isConst;
    }

    get semantics(): Ty.Semantics {
        return this.structDefs.get(this.$jp).semantics;
    }

    toTy(regionVarMap: Map<string, RegionVariable>): Ty {
        const innerRegionVarMap = new Map<string, RegionVariable>();
        for (const [name, metaRegionVar] of this.regionVarMap.entries()) {
            const regionVar = regionVarMap.get(metaRegionVar.name);
            if (regionVar === undefined) {
                throw new Error(`Region variable ${metaRegionVar.name} not found in map`);
            }
            innerRegionVarMap.set(name, regionVar);
        }

        return new StructTy(
            this.structDefs.get(this.$jp),
            innerRegionVarMap,
            this.isConst,
        );
    }
}

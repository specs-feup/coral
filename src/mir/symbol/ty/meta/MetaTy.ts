import { Joinpoint, Pragma, Type } from "@specs-feup/clava/api/Joinpoints.js";
import Region from "@specs-feup/coral/mir/symbol/Region";
import MetaRegion from "@specs-feup/coral/mir/symbol/region/meta/MetaRegion";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import LifetimeAssignmentBuilder from "@specs-feup/coral/mir/symbol/ty/meta/LifetimeAssignmentBuilder";
import MetaTyParser, { MetaRegionMapper } from "@specs-feup/coral/mir/symbol/ty/meta/MetaTyParser";
import DefMap from "@specs-feup/coral/symbol/DefMap";

interface MetaTy {
    get semantics(): Ty.Semantics;
    get isConst(): boolean;
    get jp(): Joinpoint;
    generateLifetimeAssignments(builder: LifetimeAssignmentBuilder): [LifetimeAssignmentBuilder, MetaRegion][];

    toTy(regionMap: Map<string, Region>): Ty;
}

namespace MetaTy {
    export function parse($type: Type, mapper: MetaRegionMapper, defMap: DefMap): MetaTy {
        return new MetaTyParser().parse($type, mapper, defMap);
    }
}

export default MetaTy;

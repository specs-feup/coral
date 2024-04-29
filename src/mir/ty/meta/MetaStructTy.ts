import { RecordJp } from "clava-js/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";
import MetaTy from "coral/mir/ty/meta/MetaTy";
import MetaRegionVariable from "coral/regionck/MetaRegionVariable";
import RegionVariable from "coral/regionck/RegionVariable";


export default class MetaStructTy implements MetaTy {
    isConst: boolean;
    $jp: RecordJp;

    // Maps a lifetime name to the MetaRegionVariable in the outer StructDef.
    regionVarMap: Map<string, MetaRegionVariable>;

    constructor(
        $jp: RecordJp,
        regionVarMap: Map<string, MetaRegionVariable>,
        isConst: boolean = false,
    ) {
        this.$jp = $jp;
        this.regionVarMap = regionVarMap;
        this.isConst = isConst;
    }

    get semantics(): Ty.Semantics {
        // TODO
        return {} as any;
    }

    toTy(): Ty {
        // TODO
        return {} as any;
    }
}

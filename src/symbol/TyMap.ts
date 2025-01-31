import {
    NamedDecl,
    Vardecl,
} from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";
import DefMap from "@specs-feup/coral/symbol/DefMap";
import RegionMap from "@specs-feup/coral/symbol/RegionMap";

export default class TyMap {
    /**
     * Maps {@link NamedDecl} ids to their {@link Ty}.
     */
    #tyTable: Map<string, Ty>;
    #defMap: DefMap;
    #regionMap: RegionMap;

    constructor(defMap: DefMap, regionMap: RegionMap) {
        this.#tyTable = new Map();
        this.#defMap = defMap;
        this.#regionMap = regionMap;
    }

    register($decl: Vardecl, ty: Ty): void {
        this.#tyTable.set($decl.astId, ty);
    }

    get($decl: Vardecl): Ty {
        const ty = this.#tyTable.get($decl.astId);
        if (ty !== undefined) {
            return ty;
        }

        // TODO for global variables, multiple declarations may exist
        //      we should look into every declaration to check if everything
        //      is ok

        const newTy = MetaTy.parse($decl.type, this.#regionMap.existentialMetaRegionMapper, this.#defMap)
            .toTy(this.#regionMap.map);
        this.#tyTable.set($decl.astId, newTy);
        return newTy;
    }
}

import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import UniversalRegion from "@specs-feup/coral/mir/symbol/region/UniversalRegion";

abstract class Region {
    #name: string;
    #points: Set<string>;
    #endRegions: Set<string>;

    constructor(name: string) {
        this.#name = name;
        this.#points = new Set();
        this.#endRegions = new Set();
    }

    get name(): string {
        return this.#name;
    }

    add(point: CoralCfgNode.Class): boolean {
        if (this.has(point)) {
            return true;
        }
        this.#points.add(point.id);
        return false;
    }

    has(point: CoralCfgNode.Class): boolean {
        return this.#points.has(point.id);
    }

    addEnd(region: UniversalRegion): boolean {
        if (this.#endRegions.has(region.name)) {
            return true;
        }
        this.#endRegions.add(region.name);
        return false;
    }

    /* 
     * When `region` must outlive `this`.
     * @return true if the region was changed.
     */
    abstract constrain(region: Region, node: CoralCfgNode.Class): boolean;
}

namespace Region {
    export type Kind = new (name: string) => Region;
}

export default Region;
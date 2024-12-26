import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/MetaRegionBound";
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

    missingBounds(bounds: MetaRegionBound[]): MetaRegionBound[] {
        const relevantBounds = bounds.filter(bound => bound.sup === this.#name);
        return Array
            .from(this.#endRegions)
            .filter(end => end !== this.#name)
            .filter(end => !relevantBounds.some((b) => b.sub === end))
            .map(end => new MetaRegionBound(this.#name, end));
    }

    reset(): void {
        this.#points.clear();
        this.#endRegions.clear();
    }

    /* 
     * When `region` must outlive `this`.
     * @return true if the region was changed.
     */
    abstract constrain(region: Region, node: CoralCfgNode.Class): boolean;

    toString(): string {
        const points = Array.from(this.#points);
        points.push(...Array.from(this.#endRegions).map(end => `end(${end})`));
        return `{${points.sort().join(", ")}}`;
    }
}

// TODO if single kind, we don't have to change existing code and Universal is more easily fixed
//      even reset becomes simpler
namespace Region {
    export type Kind = new (name: string) => Region;
}

export default Region;

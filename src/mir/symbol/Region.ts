import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import MetaRegion from "@specs-feup/coral/mir/symbol/region/meta/MetaRegion";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/region/meta/MetaRegionBound";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";

class Region {
    #kind: Region.Kind;
    #name: string;
    #points: Set<string>;
    // Node responsible for adding the end region
    #endRegions: Map<string, CoralCfgNode.Class | undefined>;

    constructor(kind: Region.Kind, name: string) {
        this.#kind = kind;
        this.#name = name;
        this.#points = new Set();
        this.#endRegions = new Map();
    }

    get kind(): Region.Kind {
        return this.#kind;
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

    // TODO make private to reduce problems and hide use
    addEnd(region: Region): boolean {
        if (region.kind !== Region.Kind.UNIVERSAL) {
            throw new Error("Only universal regions can be added as end regions");
        }
        
        if (this.#endRegions.has(region.name)) {
            return true;
        }
        this.#endRegions.set(region.name, undefined);
        return false;
    }

    /**
     * 
     * @param bounds 
     * @returns [bound, cause] where `bound` is the missing bound and `cause` is the node that caused it.
     */
    missingBounds(bounds: MetaRegionBound[]): [MetaRegionBound, CoralCfgNode.Class][] {
        const relevantBounds = bounds.filter((bound) => bound.sup.name === this.#name);
        return Array.from(this.#endRegions)
            .filter(([end]) => end !== this.#name)
            .filter(([end]) => !relevantBounds.some((b) => b.sub.name === end))
            .map(([end, cause]) => [new MetaRegionBound(new MetaRegion(this.#name), new MetaRegion(end)), cause!]);
    }

    reset(): void {
        this.#points.clear();
        this.#endRegions.clear();
    }

    /*
     * When `region` must outlive `this`.
     * @return true if the region was changed.
     */
    constrain(region: Region, node: CoralCfgNode.Class): boolean {
        // If there is one end region, act as universal
        if (this.#endRegions.size > 0) {
            // All points in the CFG are added
            if (this.#points.size !== region.#points.size) {
                region.#points = new Set(this.#points);
            }

            let changed = false;
            for (const pt of this.#endRegions.keys()) {
                if (!region.#endRegions.has(pt)) {
                    changed = true;
                    region.#endRegions.set(pt, node);
                }
            }

            return changed;
        }

        const nodes: CoralCfgNode.Class[] = [];
        if (this.has(node)) {
            const search = node.bfs((edge) => edge.is(ControlFlowEdge) && this.has(edge.target.expect(CoralCfgNode)));
            
            for (const { node: n } of search) {
                nodes.push(n.expect(CoralCfgNode));
            }
        }

        return nodes.some(node => !region.add(node));
    }

    toString(): string {
        const points = Array.from(this.#points);
        points.push(...Array.from(this.#endRegions.keys()).map((end) => `end(${end})`));
        return `{${points.sort().join(", ")}}`;
    }
}

// TODO if single kind, we don't have to change existing code and Universal is more easily fixed
//      even reset becomes simpler
namespace Region {
    export enum Kind {
        EXISTENTIAL = "existential",
        UNIVERSAL = "universal",
    }
}


export default Region;

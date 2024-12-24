import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";

class Region {
    #kind: Region.Kind;
    #name: string;
    #points: Set<string>;
    #endRegions: Set<string>;

    constructor(kind: Region.Kind, name: string) {
        this.#kind = kind;
        this.#name = name;
        this.#points = new Set();
        this.#endRegions = new Set();
    }

    get kind(): Region.Kind {
        return this.#kind;
    }

    get name(): string {
        return this.#name;
    }

    add(point: CoralCfgNode.Class) {
        this.#points.add(point.id);
    }

    addEnd(region: Region) {
        if (region.kind !== Region.Kind.UNIVERSAL) {
            throw new Error("Only universal regions can be end regions");
        }
        this.#endRegions.add(region.name);
    }
}

namespace Region {
    export enum Kind {
        EXISTENTIAL = "existential",
        UNIVERSAL = "universal",
    }
}

export default Region;

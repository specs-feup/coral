import Region from "@specs-feup/coral/mir/symbol/Region";

export default class MetaRegion {
    #name: string;

    constructor(name: string) {
        this.#name = name;
    }

    get name(): string {
        return this.#name;
    }

    toRegion(regionMap: Map<string, Region>): Region {
        if (!regionMap.has(this.#name)) {
            throw new Error(`Region ${this.#name} not found in map`);
        }
        return regionMap.get(this.#name)!;
    }
}

import Region from "@specs-feup/coral/mir/symbol/Region";
import MetaRegion from "@specs-feup/coral/mir/symbol/region/meta/MetaRegion";
import { MetaRegionMapper, numericMetaRegionGenerator } from "@specs-feup/coral/mir/symbol/ty/meta/MetaTyParser";

/**
 * Injects a metaGenerator with silent generation of existential regions.
 * It still yields MetaRegions, but mutates given regionMap.
 */
function* existentialRegionGenerator(
    regionMap: RegionMap,
    metaGenerator: Generator<MetaRegion, never, unknown>,
): Generator<MetaRegion, never, unknown> {
    for (const metaRegion of metaGenerator) {
        regionMap.uncheckedAdd(metaRegion.name, Region.Kind.EXISTENTIAL);
        yield metaRegion;
    }
    throw new Error("Unreachable");
}

export default class RegionMap {
    #regionTable: Map<string, Region>;
    #existentialMetaRegionGenerator: Generator<MetaRegion, never, unknown>;

    constructor() {
        this.#regionTable = new Map();
        this.#existentialMetaRegionGenerator = existentialRegionGenerator(
            this,
            numericMetaRegionGenerator(),
        );

        this.uncheckedAdd("%static", Region.Kind.UNIVERSAL);
    }

    get map(): Map<string, Region> {
        return this.#regionTable;
    }

    get existentialMetaRegionMapper(): MetaRegionMapper {
        return new MetaRegionMapper([], this.#existentialMetaRegionGenerator);
    }

    get staticRegion(): Region {
        return this.#regionTable.get("%static")!;
    }

    get regions(): Iterable<Region> {
        return this.#regionTable.values();
    }

    get universalRegions(): Iterable<Region> {
        return Array.from(this.#regionTable.values()).filter(
            (region) => region.kind === Region.Kind.UNIVERSAL,
        );
    }

    generateExistentialRegion(): Region {
        let name = this.#existentialMetaRegionGenerator.next().value.name;
        // TODO maybe add to a "to insert code" list for codegen
        return this.#regionTable.get(name)!;
    }

    add(name: string, kind: Region.Kind): Region {
        if (this.#regionTable.has(name)) {
            throw new Error(`Region name ${name} is already taken`);
        }

        return this.uncheckedAdd(name, kind);
    }

    /**
     * Does not check whether the region already exists.
     */
    uncheckedAdd(name: string, kind: Region.Kind): Region {
        const region = new Region(kind, name);
        this.#regionTable.set(name, region);
        return region;
    }
}

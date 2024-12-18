import Region from "@specs-feup/coral/regionck/Region";

function* existentialNameGenerator(): Generator<string, never, unknown> {
    let i = 0;
    while (true) {
        yield `%${i}`;
        i += 1;
    }
}

function* universalNameGenerator(): Generator<string, never, unknown> {
    let i = 0;
    while (true) {
        let name = "";
        let j = i;
        while (j >= 0) {
            name = String.fromCharCode((j % 26) + 97) + name;
            j = Math.floor(j / 26) - 1;
        }
        yield `%${name}`;
        i += 1;
    }
}

export default class RegionMap {
    #regionTable: Map<string, Region>;
    #existentialNameGenerator: Generator<string, never, unknown>;
    #universalNameGenerator: Generator<string, never, unknown>;

    constructor() {
        this.#regionTable = new Map();
        this.#existentialNameGenerator = existentialNameGenerator();
        this.#universalNameGenerator = universalNameGenerator();

        this.#internalAddRegion(Region.Kind.UNIVERSAL, "%static");
    }

    #getGenerator(kind: Region.Kind): Generator<string, never, unknown> {
        switch (kind) {
            case Region.Kind.EXISTENTIAL:
                return this.#existentialNameGenerator;
            case Region.Kind.UNIVERSAL:
                return this.#universalNameGenerator;
        }
    }

    get staticRegion(): Region {
        return this.#regionTable.get("%static")!;
    }

    get regions(): Iterable<Region> {
        return this.#regionTable.values();
    }

    generate(kind: Region.Kind): Region {
        const generator = this.#getGenerator(kind);
        let name;
        do {
            name = generator.next().value;
        } while (this.#regionTable.has(name));

        // TODO maybe add to a "to insert code" list

        return this.#internalAddRegion(kind, name);
    }

    add(name: string, kind: Region.Kind): Region {
        if (this.#regionTable.has(name)) {
            throw new Error(`Region name ${name} is already taken`);
        }

        return this.#internalAddRegion(kind, name);
    }

    /**
     * Does not check whether the region already exists.
     */
    #internalAddRegion(kind: Region.Kind, name: string): Region {
        const region = new Region(kind, name);
        this.#regionTable.set(name, region);
        return region;
    }
}

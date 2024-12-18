class Region {
    #kind: Region.Kind;
    #actualKind: Region.Kind;
    #name: string;
    #points: Set<string>;

    constructor(kind: Region.Kind, name: string) {
        this.#kind = kind;
        this.#actualKind = kind;
        this.#name = name;
        this.#points = new Set();
    }

    get kind(): Region.Kind {
        return this.#kind;
    }

    get name(): string {
        return this.#name;
    }
}

namespace Region {
    export enum Kind {
        EXISTENTIAL = "existential",
        UNIVERSAL = "universal",
    }
}

export default Region;

class RegionVariable {
    kind: RegionVariable.Kind;
    actualKind: RegionVariable.Kind;
    name: string;
    id: string;
    points: Set<string>;

    constructor(id: string, kind: RegionVariable.Kind, name: string) {
        this.kind = kind;
        this.actualKind = kind;
        this.id = id;
        this.name = name;
        this.points = new Set();
    }
}

namespace RegionVariable {
    export enum Kind {
        EXISTENTIAL = "existential",
        UNIVERSAL = "universal",
    }
}

export default RegionVariable;

class RegionKind {
    static EXISTENTIAL = "existential";
    static UNIVERSAL = "universal";
}

class RegionVariable {
    /**
     * @param {RegionKind} kind
     */
    kind;

    name;

    id;

    points;

    
    constructor(id, kind, name, $expr) {
        this.kind = kind;
        this.id = id;
        this.name = name;
        this.points = new Set();
    }

}
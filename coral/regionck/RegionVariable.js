laraImport("coral.regionck.RegionKind");

class RegionVariable {
    /**
     * @param {RegionKind} kind
     */
    kind;

    /**
     * @type {string}
     */
    name;

    /**
     * @type {string}
     */
    id;

    /**
     * @type {Set<string>}
     */
    points;
    
    constructor(id, kind, name, $expr) {
        this.kind = kind;
        this.id = id;
        this.name = name;
        this.points = new Set();
    }

}
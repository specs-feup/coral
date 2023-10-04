import Path from "./path/Path.js";
import AccessMutability from "./AccessMutability.js";
import AccessDepth from "./AccessDepth.js";

export default class Access {
    
    /**
     * @type {AccessMutability}
     */
    mutability;
    
    /**
     * @type {AccessDepth}
     */
    depth;

    /**
     * @type {Path}
     */
    path;

    constructor(path, mutability, depth) {
        this.path = path;
        this.mutability = mutability;
        this.depth = depth;
    }

    toString() {
        return `${this.depth} ${this.mutability} of ${this.path.toString()}`;
    }

}
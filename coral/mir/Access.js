class AccessMutability {
    static READ = "read";
    static WRITE = "write";
}

class AccessDepth {
    static SHALLOW = "shallow";
    static DEEP = "deep";
}

class Access {
    
    /**
     * @type {AccessMutability}
     */
    mutability;
    
    /**
     * @type {AccessDepth}
     */
    depth;

    /**
     * 
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
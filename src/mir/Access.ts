import Path from "coral/mir/path/Path";

class Access {
    mutability: Access.Mutability;
    depth: Access.Depth;
    path: Path;

    constructor(path: Path, mutability: Access.Mutability, depth: Access.Depth) {
        this.path = path;
        this.mutability = mutability;
        this.depth = depth;
    }

    toString(): string {
        return `${this.depth} ${this.mutability} of ${this.path.toString()}`;
    }
}

namespace Access {
    export enum Mutability {
        READ = "read",
        WRITE = "write",
    }

    export enum Depth {
        SHALLOW = "shallow",
        DEEP = "deep",
    }
}

export default Access;

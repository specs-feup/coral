import Path from "coral/mir/path/Path";
import Ty from "coral/mir/ty/Ty";

class Access {
    mutability: Access.Mutability;
    depth: Access.Depth;
    path: Path;

    constructor(path: Path, mutability: Access.Mutability, depth: Access.Depth) {
        this.path = path;
        this.mutability = mutability;
        this.depth = depth;
    }

    get isMove(): boolean {
        console.log("Im trying to move?");
        console.log(this.mutability);
        console.log(this.path.ty.semantics);
        return (
            this.mutability === Access.Mutability.READ &&
            this.path.ty.semantics === Ty.Semantics.MOVE
        );
    }

    toString(): string {
        return `${this.depth} ${this.mutability} of ${this.path.toString()}`;
    }
}

namespace Access {
    export enum Mutability {
        READ = "read",
        WRITE = "write",
        BORROW = "borrow",
        MUTABLE_BORROW = "mutable borrow",
    }

    export enum Depth {
        SHALLOW = "shallow",
        DEEP = "deep",
    }
}

export default Access;

import Path from "@specs-feup/coral/mir/path/Path";
import BorrowKind from "@specs-feup/coral/mir/ty/BorrowKind";
import Ty from "@specs-feup/coral/mir/ty/Ty";

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
        return (
            this.mutability === Access.Mutability.READ &&
            this.path.ty.semantics === Ty.Semantics.MOVE
        );
    }

    toString(): string {
        return `${this.path.toString()}, ${this.mutability}, ${this.depth}`;
    }
}

namespace Access {
    export enum Mutability {
        READ = "read",
        WRITE = "write",
        BORROW = "borrow",
        MUTABLE_BORROW = "mutable borrow",
        STORAGE_DEAD = "storage dead",
    }

    export namespace Mutability {
        export function fromBorrowKind(kind: BorrowKind): Mutability {
            switch (kind) {
                case BorrowKind.SHARED:
                    return Mutability.BORROW;
                case BorrowKind.MUTABLE:
                    return Mutability.MUTABLE_BORROW;
            }
        }
    }

    export enum Depth {
        SHALLOW = "shallow",
        DEEP = "deep",
    }
}

export default Access;

import Loan from "@specs-feup/coral/mir/Loan";
import Path from "@specs-feup/coral/mir/path/Path";
import Ty from "@specs-feup/coral/mir/symbol/Ty";

class Access {
    #path: Path;
    #kind: Access.Kind;

    constructor(path: Path, kind: Access.Kind) {
        this.#path = path;
        this.#kind = kind;
    }

    get path(): Path {
        return this.#path;
    }

    get kind(): Access.Kind {
        return this.#kind;
    }

    get isMove(): boolean {
        return (
            this.#kind === Access.Kind.READ &&
            this.#path.ty.semantics === Ty.Semantics.MOVE
        );
    }

    get depth(): Access.Depth {
        if (this.#kind === Access.Kind.STORAGE_DEAD || this.#kind === Access.Kind.WRITE) {
            return Access.Depth.SHALLOW;
        }

        return Access.Depth.DEEP;
    }
}

namespace Access {
    export enum Kind {
        READ = "read",
        WRITE = "write",
        BORROW = "borrow",
        MUTABLE_BORROW = "mutable borrow",
        STORAGE_DEAD = "storage dead",
    }

    export namespace Kind {
        export function fromLoanKind(kind: Loan.Kind): Kind {
            switch (kind) {
                case Loan.Kind.SHARED:
                    return Kind.BORROW;
                case Loan.Kind.MUTABLE:
                    return Kind.MUTABLE_BORROW;
            }
        }
    }

    export enum Depth {
        SHALLOW = "shallow",
        DEEP = "deep",
    }
}

export default Access;

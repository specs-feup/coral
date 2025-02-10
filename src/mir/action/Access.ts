import Loan from "@specs-feup/coral/mir/action/Loan";
import Path from "@specs-feup/coral/mir/path/Path";
import PathVarRef from "@specs-feup/coral/mir/path/PathVarRef";
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

    /**
     * Returns whether this access is the write at the declaration of a variable
     * due to an init.
     */
    get isVardecl(): boolean {
        return this.#path instanceof PathVarRef && this.#path.isVarDecl;
    }
}

namespace Access {
    export enum Kind {
        READ = "read",
        WRITE = "write",
        BORROW = "borrow",
        MUTABLE_BORROW = "borrow-mut",
        STORAGE_DEAD = "kill",
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

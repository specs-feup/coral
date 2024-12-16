import { UnaryOp, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Loan from "@specs-feup/coral/mir/Loan";
import Path from "@specs-feup/coral/mir/path/Path";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import RefTy from "@specs-feup/coral/mir/symbol/ty/RefTy";

/**
 * A dereference of a path, such as `*x`.
 */
export default class PathDeref implements Path {
    #jp: UnaryOp;
    /**
     * The path being dereferenced. For example, in `*x`, this would be `x`.
     */
    #inner: Path;
    /**
     * The type of the path being dereferenced. For example, in `*x` of type `int`, this would be the type `&int`.
     */
    #innerTy: RefTy;

    constructor($jp: UnaryOp, inner: Path) {
        this.#jp = $jp;
        this.#inner = inner;

        if (inner.ty instanceof RefTy) {
            this.#innerTy = inner.ty;
        } else {
            throw new Error(
                "Cannot dereference non-reference type " + inner.ty.toString(),
            );
        }
    }

    toString(): string {
        return `*${this.#inner.toString()}`;
    }

    equals(other: Path): boolean {
        return other instanceof PathDeref && this.#inner.equals(other.#inner);
    }

    contains(other: Path): boolean {
        return this.equals(other) || this.#inner.contains(other);
    }

    get prefixes(): Path[] {
        return [this, ...this.#inner.prefixes];
    }

    get shallowPrefixes(): Path[] {
        return [this];
    }

    get supportingPrefixes(): Path[] {
        if (this.#innerTy.loanKind === Loan.Kind.MUTABLE) {
            return [this, ...this.#inner.supportingPrefixes];
        } else {
            return [this];
        }
    }

    get ty(): Ty {
        return this.#innerTy.referent;
    }

    get jp(): UnaryOp {
        return this.#jp;
    }

    get vardecl(): Vardecl {
        return this.#inner.vardecl;
    }
}

import {
    Expression,
    Joinpoint,
    UnaryOp,
    Vardecl,
} from "@specs-feup/clava/api/Joinpoints.js";

import Path from "@specs-feup/coral/mir/path/Path";
import Ty from "@specs-feup/coral/mir/ty/Ty";
import RefTy from "@specs-feup/coral/mir/ty/RefTy";
import BorrowKind from "@specs-feup/coral/mir/ty/BorrowKind";

/**
 * A dereference of a path, such as `*x`.
 */
export default class PathDeref extends Path {
    $jp: UnaryOp;
    /**
     * The path being dereferenced. For example, in `*x`, this would be `x`.
     */
    inner: Path;
    /**
     * The type of the path being dereferenced. For example, in `*x` of type `int`, this would be the type `&int`.
     */
    innerTy: RefTy;

    constructor($jp: UnaryOp, inner: Path) {
        super();
        this.$jp = $jp;
        this.inner = inner;

        if (inner.ty instanceof RefTy) {
            this.innerTy = inner.ty;
        } else {
            throw new Error(
                "Cannot dereference non-reference type " + inner.ty.toString(),
            );
        }
    }

    override toString(): string {
        return `*${this.inner.toString()}`;
    }

    override equals(other: Path): boolean {
        return other instanceof PathDeref && this.inner.equals(other.inner);
    }

    override contains(other: Path): boolean {
        return this.equals(other) || this.inner.contains(other);
    }

    override get prefixes(): Path[] {
        return [this, ...this.inner.prefixes];
    }

    override get shallowPrefixes(): Path[] {
        return [this];
    }

    override get supportingPrefixes(): Path[] {
        if (this.innerTy.borrowKind === BorrowKind.MUTABLE) {
            return [this, ...this.inner.supportingPrefixes];
        } else {
            return [this];
        }
    }

    override get ty(): Ty {
        return this.innerTy.referent;
    }

    override get innerVardecl(): Vardecl {
        return this.inner.innerVardecl;
    }
}

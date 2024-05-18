import { Joinpoint, Vardecl } from "clava-js/api/Joinpoints.js";

import Path from "coral/mir/path/Path";
import Ty from "coral/mir/ty/Ty";
import RefTy from "coral/mir/ty/RefTy";
import BorrowKind from "coral/mir/ty/BorrowKind";

/**
 * A dereference of a path, such as `*x`.
 */
export default class PathDeref extends Path {
    $jp: Joinpoint;
    /**
     * The path being dereferenced. For example, in `*x`, this would be `x`.
     */
    inner: Path;
    /**
     * The type of the path being dereferenced. For example, in `*x` of type `int`, this would be the type `&int`.
     */
    innerTy: RefTy;

    constructor($jp: Joinpoint, inner: Path) {
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

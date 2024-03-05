import Path from "coral/mir/path/Path";
import Ty from "coral/mir/ty/Ty";
import RefTy from "coral/mir/ty/RefTy";
import BorrowKind from "coral/mir/ty/BorrowKind";
import Regionck from "coral/regionck/Regionck";
import { Joinpoint } from "clava-js/api/Joinpoints";
import RegionVariable from "coral/regionck/RegionVariable";

export default class PathDeref extends Path {
    $jp: Joinpoint;
    inner: Path;
    borrowKind: BorrowKind;
    regionvar: RegionVariable;

    constructor(
        $jp: Joinpoint,
        inner: Path,
        borrowKind: BorrowKind,
        regionvar: RegionVariable,
    ) {
        super();
        this.$jp = $jp;
        this.inner = inner;
        this.borrowKind = borrowKind;
        this.regionvar = regionvar;
    }

    override toString(): string {
        return "(*" + this.inner.toString() + ")";
    }

    override equals(other: Path): boolean {
        return other instanceof PathDeref && this.inner.equals(other.inner);
    }

    override prefixes(): Path[] {
        return [this, ...this.inner.prefixes()];
    }

    override shallowPrefixes(): Path[] {
        return [this];
    }

    override supportingPrefixes(): Path[] {
        return this.borrowKind === BorrowKind.MUTABLE
            ? [this, ...this.inner.supportingPrefixes()]
            : [this];
    }

    override retrieveTy(regionck: Regionck): Ty {
        const inner_ty = this.inner.retrieveTy(regionck);
        if (!(inner_ty instanceof RefTy))
            throw new Error(
                "Cannot dereference non-reference type " + inner_ty.toString(),
            );
        return inner_ty.referent;
    }
}

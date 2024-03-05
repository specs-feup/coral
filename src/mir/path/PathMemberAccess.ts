import { Joinpoint } from "clava-js/api/Joinpoints.js";
import Path from "coral/mir/path/Path";
import Ty from "coral/mir/ty/Ty";
import Regionck from "coral/regionck/Regionck";

// TODO why is this all unimplemented
export default class PathMemberAccess extends Path {
    $jp: Joinpoint;
    inner: Path;

    constructor($jp: Joinpoint, inner: Path) {
        super();

        this.$jp = $jp;
        this.inner = inner;
    }

    override toString(): string {
        throw new Error("PathMemberAccess toString() not implemented");
    }

    override equals(other: Path): boolean {
        throw new Error("PathMemberAccess equals() not implemented");
    }

    override prefixes(): Path[] {
        return [this, ...this.inner.prefixes()];
    }

    override shallowPrefixes(): Path[] {
        return [this, ...this.inner.shallowPrefixes()];
    }

    override supportingPrefixes(): Path[] {
        return [this, ...this.inner.supportingPrefixes()];
    }

    override retrieveTy(regionck: Regionck): Ty {
        throw new Error("TODO: PathMemberAccess retrieveTy() not implemented");
    }
}

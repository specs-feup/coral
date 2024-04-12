import { Vardecl, Varref } from "clava-js/api/Joinpoints.js";
import Path from "coral/mir/path/Path";
import Ty from "coral/mir/ty/Ty";

/**
 * A direct reference or declaration of a variable, such as `x` or `int y`.
 */
export default class PathVarRef extends Path {
    $jp: Vardecl | Varref;
    override ty: Ty;

    constructor($jp: Vardecl | Varref, ty: Ty) {
        super();
        this.$jp = $jp;
        this.ty = ty;
    }

    override toString(): string {
        return this.$jp.name;
    }

    override equals(other: PathVarRef): boolean {
        return other instanceof PathVarRef && this.$jp.name === other.$jp.name;
    }

    override get prefixes(): Path[] {
        return [this];
    }

    override get shallowPrefixes(): Path[] {
        return [this];
    }

    override get supportingPrefixes(): Path[] {
        return [this];
    }

    get $vardecl(): Vardecl {
        if (this.$jp instanceof Vardecl) {
            return this.$jp;
        }
        return this.$jp.vardecl;
    }
}

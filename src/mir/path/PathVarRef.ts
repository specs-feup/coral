import { Vardecl, Varref } from "@specs-feup/clava/api/Joinpoints.js";
import ClavaJoinPoints from "@specs-feup/clava/api/clava/ClavaJoinPoints.js";
import Path from "@specs-feup/coral/mir/path/Path";
import Ty from "@specs-feup/coral/mir/ty/Ty";

/**
 * A direct reference or declaration of a variable, such as `x` or `int y`.
 */
export default class PathVarRef extends Path {
    $jp: Varref;
    override ty: Ty;

    constructor($jp: Vardecl | Varref, ty: Ty) {
        super();
        if ($jp instanceof Vardecl) {
            $jp = ClavaJoinPoints.varRef($jp);
        }
        this.$jp = $jp;
        this.ty = ty;
    }

    override toString(): string {
        return this.$jp.name;
    }

    override equals(other: PathVarRef): boolean {
        return other instanceof PathVarRef && this.$jp.name === other.$jp.name;
    }

    override contains(other: PathVarRef): boolean {
        return this.equals(other);
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
        return this.$jp.vardecl;
    }

    override get innerVardecl(): Vardecl {
        return this.$vardecl;
    }
}

import { Vardecl, Varref } from "@specs-feup/clava/api/Joinpoints.js";
import ClavaJoinPoints from "@specs-feup/clava/api/clava/ClavaJoinPoints.js";
import Path from "@specs-feup/coral/mir/path/Path";
import Ty from "@specs-feup/coral/mir/symbol/Ty";

/**
 * A direct reference or declaration of a variable, such as `x` or `int y`.
 */
export default class PathVarRef implements Path {
    #jp: Varref;
    #ty: Ty;
    #isVarDecl;

    constructor($jp: Vardecl | Varref, ty: Ty) {
        if ($jp instanceof Vardecl) {
            $jp = ClavaJoinPoints.varRef($jp);
            this.#isVarDecl = true;
        } else {
            this.#isVarDecl = false;
        }
        this.#jp = $jp;
        this.#ty = ty;
    }

    toString(): string {
        return this.#jp.name;
    }

    equals(other: Path): boolean {
        return other instanceof PathVarRef && this.#jp.name === other.#jp.name;
    }

    contains(other: PathVarRef): boolean {
        return this.equals(other);
    }

    get prefixes(): Path[] {
        return [this];
    }

    get shallowPrefixes(): Path[] {
        return [this];
    }

    get supportingPrefixes(): Path[] {
        return [this];
    }

    get ty(): Ty {
        return this.#ty;
    }

    get jp(): Varref {
        return this.#jp;
    }

    get vardecl(): Vardecl {
        return this.#jp.vardecl;
    }

    get isVarDecl(): boolean {
        return this.#isVarDecl;
    }
}

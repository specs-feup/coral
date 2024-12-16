import { Expression, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/symbol/Ty";

/**
 * A path to a value, such as `a` or `(*x).y`.
 */
export default interface Path {
    // TODO toString could be interpreted as the canonical name or the code in the source file
    //      maybe another name would be better (e.g. the canonical name of (a.b).c is a.b.c)
    toString(): string;
    equals(other: Path): boolean;
    contains(other: Path): boolean;
    get prefixes(): Path[];
    get shallowPrefixes(): Path[];
    get supportingPrefixes(): Path[];
    /**
     * Retrieve the type of the value at this path.
     */
    get ty(): Ty;
    get jp(): Expression;
    get vardecl(): Vardecl;
}

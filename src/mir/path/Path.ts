import { Expression, Joinpoint, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";

/**
 * A path to a value, such as `a` or `(*x).y`.
 */
export default abstract class Path {
    abstract toString(): string;
    abstract equals(other: Path): boolean;
    abstract contains(other: Path): boolean;
    abstract get prefixes(): Path[];
    abstract get shallowPrefixes(): Path[];
    abstract get supportingPrefixes(): Path[];
    /**
     * Retrieve the type of the value at this path.
     */
    abstract get ty(): Ty;
    abstract get $jp(): Expression;
    abstract get innerVardecl(): Vardecl;
}

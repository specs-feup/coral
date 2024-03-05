import Ty from "../ty/Ty.js";
import Regionck from "../../regionck/Regionck.js";

export default abstract class Path {
    abstract toString(): string;
    abstract equals(other: Path): boolean;
    abstract prefixes(): Path[];
    abstract shallowPrefixes(): Path[];
    abstract supportingPrefixes(): Path[];
    abstract retrieveTy(regionck: Regionck): Ty;
}

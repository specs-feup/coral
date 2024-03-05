import Ty from "coral/mir/ty/Ty";
import Regionck from "coral/regionck/Regionck";

export default abstract class Path {
    abstract toString(): string;
    abstract equals(other: Path): boolean;
    abstract prefixes(): Path[];
    abstract shallowPrefixes(): Path[];
    abstract supportingPrefixes(): Path[];
    abstract retrieveTy(regionck: Regionck): Ty;
}

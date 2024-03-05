import Path from "coral/mir/path/Path";
import Ty from "coral/mir/ty/Ty";

class Assignment {
    kind: Assignment.Kind;
    fromPath: Path | undefined;
    toPath: Path;
    fromTy: Ty | undefined;
    toTy: Ty;

    constructor(
        kind: Assignment.Kind,
        toPath: Path,
        toTy: Ty,
        fromPath: Path | undefined = undefined,
        fromTy: Ty | undefined = undefined,
    ) {
        this.kind = kind;
        this.toPath = toPath;
        this.toTy = toTy;
        this.fromPath = fromPath;
        this.fromTy = fromTy;
    }

    toString(): string {
        if (this.fromPath === undefined)
            return `${this.kind} to ${this.toPath.toString()}`;
        else
            return `${this.kind} from ${this.fromPath.toString()} to ${this.toPath.toString()}`;
    }
}

namespace Assignment {
    export enum Kind {
        MOVE = "move",
        COPY = "copy",
        LITERAL = "literal",
        UNKNOWN = "unknown",
    }
}

export default Assignment;

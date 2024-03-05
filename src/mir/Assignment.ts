import Path from "./path/Path.js";
import Ty from "./ty/Ty.js";

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
        if (this.fromPath === undefined) return `${this.kind} to ${this.toPath}`;
        else return `${this.kind} from ${this.fromPath} to ${this.toPath}`;
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

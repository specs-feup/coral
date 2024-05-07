import LfPath from "coral/pragma/lifetime/path/LfPath";
import LfPathVarRef from "coral/pragma/lifetime/path/LfPathVarRef";

export default class LfPathDeref extends LfPath {
    inner: LfPathVarRef | LfPathDeref;

    constructor(inner: LfPathVarRef | LfPathDeref) {
        super();
        this.inner = inner;
    }

    override get varName(): string {
        return this.inner.varName;
    }

    toString(): string {
        return `(*${this.inner.toString()})`;
    }
}

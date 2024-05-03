import LfPath from "coral/pragma/lifetime/path/LfPath";
import LfPathDeref from "coral/pragma/lifetime/path/LfPathDeref";
import LfPathVarRef from "coral/pragma/lifetime/path/LfPathVarRef";

export default class LfPathMemberAccess extends LfPath {
    inner: LfPathVarRef | LfPathDeref;
    member: string;

    constructor(inner: LfPathVarRef | LfPathDeref, member: string) {
        super();
        this.inner = inner;
        this.member = member;
    }

    toString(): string {
        return `${this.inner.toString()}.${this.member}`;
    }
}

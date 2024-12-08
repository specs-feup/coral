import LfPath from "@specs-feup/coral/pragma/lifetime/path/LfPath";
import LfPathDeref from "@specs-feup/coral/pragma/lifetime/path/LfPathDeref";
import LfPathVarRef from "@specs-feup/coral/pragma/lifetime/path/LfPathVarRef";

export default class LfPathMemberAccess extends LfPath {
    inner: LfPathVarRef | LfPathDeref;
    member: string;

    constructor(inner: LfPathVarRef | LfPathDeref, member: string) {
        super();
        this.inner = inner;
        this.member = member;
    }

    override get varName(): string {
        return this.inner.varName;
    }

    toString(): string {
        return `${this.inner.toString()}.${this.member}`;
    }
}

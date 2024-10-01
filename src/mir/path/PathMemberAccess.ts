import { Expression, Joinpoint, MemberAccess, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Path from "coral/mir/path/Path";
import StructTy from "coral/mir/ty/StructTy";
import Ty from "coral/mir/ty/Ty";


/**
 * A member access, such as `x.y`.
 */
export default class PathMemberAccess extends Path {
    $jp: MemberAccess;
    inner: Path;
    fieldName: string;
    innerTy: StructTy;

    constructor($jp: MemberAccess, inner: Path, fieldName: string) {
        super();

        this.$jp = $jp;
        this.inner = inner;
        this.fieldName = fieldName;

        if (inner.ty instanceof StructTy) {
            this.innerTy = inner.ty;
        } else {
            throw new Error(
                "Cannot member-access in non-struct type " + inner.ty.toString(),
            );
        }
    }

    override toString(): string {
        return `(${this.inner.toString()}).${this.fieldName}`;
    }

    override equals(other: Path): boolean {
        return (
            other instanceof PathMemberAccess &&
            this.inner.equals(other.inner) &&
            this.fieldName === other.fieldName
        );
    }

    override contains(other: Path): boolean {	
        return this.equals(other) || this.inner.contains(other);	
    }

    override get prefixes(): Path[] {
        return [this, ...this.inner.prefixes];
    }

    override get shallowPrefixes(): Path[] {
        return [this, ...this.inner.shallowPrefixes];
    }

    override get supportingPrefixes(): Path[] {
        return [this, ...this.inner.supportingPrefixes];
    }

    override get ty(): Ty {
        const ty = this.innerTy.fields.get(this.fieldName);
        if (ty === undefined) {
            throw new Error(
                `Field ${this.fieldName} not found in struct ${this.innerTy.name}`,
            );
        }

        return ty;
    }

    override get innerVardecl(): Vardecl {
        return this.inner.innerVardecl;
    }
}

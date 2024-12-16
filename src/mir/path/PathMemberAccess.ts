import {
    MemberAccess,
    Vardecl,
} from "@specs-feup/clava/api/Joinpoints.js";
import Path from "@specs-feup/coral/mir/path/Path";
import PathDeref from "@specs-feup/coral/mir/path/PathDeref";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import StructTy from "@specs-feup/coral/mir/symbol/ty/StructTy";

/**
 * A member access, such as `x.y`.
 */
export default class PathMemberAccess implements Path {
    #jp: MemberAccess;
    #inner: Path;
    #fieldName: string;
    #innerTy: StructTy;

    constructor($jp: MemberAccess, inner: Path, fieldName: string) {
        this.#jp = $jp;
        this.#inner = inner;
        this.#fieldName = fieldName;

        if (inner.ty instanceof StructTy) {
            this.#innerTy = inner.ty;
        } else {
            throw new Error(
                "Cannot member-access in non-struct type " + inner.ty.toString(),
            );
        }
    }

    toString(): string {
        if (this.#inner instanceof PathDeref) {
            return `(${this.#inner.toString()}).${this.#fieldName}`;
        } else {
            return `${this.#inner.toString()}.${this.#fieldName}`;
        }
    }

    equals(other: Path): boolean {
        return (
            other instanceof PathMemberAccess &&
            this.#fieldName === other.#fieldName && 
            this.#inner.equals(other.#inner)
        );
    }

    contains(other: Path): boolean {
        return this.equals(other) || this.#inner.contains(other);
    }

    get prefixes(): Path[] {
        return [this, ...this.#inner.prefixes];
    }

    get shallowPrefixes(): Path[] {
        return [this, ...this.#inner.shallowPrefixes];
    }

    get supportingPrefixes(): Path[] {
        return [this, ...this.#inner.supportingPrefixes];
    }

    get ty(): Ty {
        const ty = this.#innerTy.fields.get(this.#fieldName);
        if (ty === undefined) {
            throw new Error(
                `Field ${this.#fieldName} not found in ${this.#innerTy.toString()}`,
            );
        }

        return ty;
    }

    get jp(): MemberAccess {
        return this.#jp;
    }

    get vardecl(): Vardecl {
        return this.#inner.vardecl;
    }
}

import { Joinpoint, Vardecl, Varref } from "clava-js/api/Joinpoints.js";
import Path from "./Path.js";
import Ty from "../ty/Ty.js";
import Regionck from "../../regionck/Regionck.js";


export default class PathVarRef extends Path {
    $jp: Vardecl | Varref;

    constructor($jp: Vardecl | Varref) {
        super();
        this.$jp = $jp;
    }

    override toString(): string {
        return this.$jp.name;
    }

    override equals(other: PathVarRef): boolean {
        return other instanceof PathVarRef && this.$jp.name === other.$jp.name;
    }

    override prefixes(): Path[] {
        return [this];
    }

    override shallowPrefixes(): Path[] {
        return [this];
    }

    override supportingPrefixes(): Path[] {
        return [this];
    }

    override retrieveTy(regionck: Regionck): Ty {
        const ty = regionck.declarations.get(this.$jp.name);
        if (ty === undefined) {
            throw new Error("Variable " + this.$jp.name + " not found");
        }
        return ty;
    }
}

import Path from "./Path.js";
import PathKind from "./PathKind.js";
import Ty from "../../ty/Ty.js";
import RefTy from "../../ty/RefTy.js";
import BorrowKind from "../../ty/BorrowKind.js";
import Regionck from "../../borrowck/Regionck.js";
import RegionVariable from "../../borrowck/RegionVariable.js";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

export default class PathDeref extends Path {
   
    /**
     * @type {BorrowKind}
     */
    borrowKind;

    /**
     * 
     * @param {Joinpoint} $jp 
     * @param {Path} inner 
     * @param {BorrowKind} borrowKind 
     * @param {RegionVariable} regionVar
     */
    constructor($jp, inner, borrowKind, regionVar) {
        super($jp, inner);

        this.borrowKind = borrowKind;
        this.regionVar = regionVar;
    }

    /**
     * @returns {PathKind}
     */
    get kind() {
        return PathKind.DEREF;
    }

    /** 
     * @returns {string}
     */
    toString() {
        return "(*" + this.inner.toString() + ")";
    }

    /**
     * @param {PathDeref} other
     * @returns {boolean}
     */
    equals(other) {
        return this.kind === other.kind && this.inner.equals(other.inner);
    }
    
    /**
     * @return {Path[]}
     */
    prefixes() {
        return [this, ...this.inner.prefixes()];
    }

    /**
     * @returns {Path[]}
     */
    shallowPrefixes() {
        return [this];
    }

    /**
     * @returns {Path[]}
     */
    supportingPrefixes() {
        return this.borrowKind === BorrowKind.MUTABLE ? [this, ...this.inner.supportingPrefixes() ] : [this];
    }

    /**
     * @param {Regionck} regionck
     * @returns {Ty}
     */
    retrieveTy(regionck) {
        const inner_ty = this.inner.retrieveTy(regionck);
        if (!(inner_ty instanceof RefTy))
            throw new Error("Cannot dereference non-reference type " + inner_ty.toString());
        return inner_ty.referent;
    }
}
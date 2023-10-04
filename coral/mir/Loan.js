import { Joinpoint } from "clava-js/api/Joinpoints.js"; 

import RegionVariable from "./borrowck/RegionVariable.js";
import Ty from "./ty/Ty.js";
import BorrowKind from "./ty/BorrowKind.js";
import RefTy from "./ty/RefTy.js";
import Path from "./mir/path/Path.js";

export default class Loan {

    /**
     * @type {RegionVariable}
     */
    regionVar;

    /**
     * @type {Ty}
     */
    leftTy

    /**
     * @type {Ty}
     */
    loanedTy;

    /**
     * @type {Path}
     */
    loanedPath;

    /**
     * Joinpoint where the loan was created
     * @type {Joinpoint}
     */
    $jp;


    /**
     * @type {cytoscape node}
     */
    node;


    constructor(regionVar, leftTy, loanedTy, loanedPath, $jp, node) {
        this.regionVar = regionVar;
        this.leftTy = leftTy;
        this.loanedTy = loanedTy;
        this.loanedPath = loanedPath;
        this.$jp = $jp;
        this.node = node;
    }

    toString() {
        return `${this.borrowKind == BorrowKind.MUTABLE ? "&mut" : "&"}'${this.regionVar.name} ${this.loanedPath.toString()}`;
    }

    /**
     * @returns {BorrowKind}
     */
    get borrowKind() {
        return this.leftTy.borrowKind;
    }

    /**
     * @returns {RefTy}
     */
    get loanedRefTy() {
        // TODO: What about isConst?
        return new RefTy(this.borrowKind, this.loanedTy, this.regionVar);
    }

}

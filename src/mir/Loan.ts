import { Joinpoint } from "clava-js/api/Joinpoints.js";
import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";
import Path from "coral/mir/path/Path";
import Ty from "coral/mir/ty/Ty";
import RefTy from "coral/mir/ty/RefTy";
import BorrowKind from "coral/mir/ty/BorrowKind";
import RegionVariable from "coral/regionck/RegionVariable";
import CoralNode from "coral/graph/CoralNode";

export default class Loan {
    node: CoralNode.Class;
    regionVar: RegionVariable;
    reborrow: boolean;
    leftTy: RefTy;
    loanedPath: Path;
    loanedTy: Ty;
    loanedRefTy: RefTy;

    constructor(
        node: CoralNode.Class,
        regionVar: RegionVariable,
        reborrow: boolean,
        leftTy: RefTy,
        loanedPath: Path,
        loanedTy?: Ty,
    ) {
        this.node = node;
        this.regionVar = regionVar;
        this.reborrow = reborrow;
        this.leftTy = leftTy;
        this.loanedPath = loanedPath;

        this.loanedTy = loanedTy ?? loanedPath.ty;
        this.loanedRefTy = new RefTy(this.borrowKind, this.loanedTy, this.leftTy.$jp, this.regionVar);
    }

    toString(): string {
        return `${this.borrowKind == BorrowKind.MUTABLE ? "&mut" : "&"}'${this.regionVar.name} ${this.loanedPath.toString()}`;
    }

    get borrowKind(): BorrowKind {
        return this.leftTy.borrowKind;
    }
}

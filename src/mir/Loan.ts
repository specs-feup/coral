import { Joinpoint } from "clava-js/api/Joinpoints.js";
import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";
import Path from "./path/Path.js";
import Ty from "./ty/Ty.js";
import RefTy from "./ty/RefTy.js";
import BorrowKind from "./ty/BorrowKind.js";
import RegionVariable from "../regionck/RegionVariable.js";


export default class Loan {
    regionVar: RegionVariable;
    leftTy: RefTy;
    loanedTy: Ty;
    loanedPath: Path;
    $jp: Joinpoint;
    node: cytoscape.NodeSingular;

    constructor(
        regionVar: RegionVariable,
        leftTy: RefTy,
        loanedTy: Ty,
        loanedPath: Path,
        $jp: Joinpoint,
        node: cytoscape.NodeSingular,
    ) {
        this.regionVar = regionVar;
        this.leftTy = leftTy;
        this.loanedTy = loanedTy;
        this.loanedPath = loanedPath;
        this.$jp = $jp;
        this.node = node;
    }

    toString(): string {
        return `${this.borrowKind == BorrowKind.MUTABLE ? "&mut" : "&"}'${this.regionVar.name} ${this.loanedPath.toString()}`;
    }

    get borrowKind(): BorrowKind {
        return this.leftTy.borrowKind;
    }

    get loanedRefTy(): RefTy {
        // TODO: What about isConst?
        return new RefTy(this.borrowKind, this.loanedTy, this.regionVar);
    }
}

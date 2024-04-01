import Pass from "lara-js/api/lara/pass/Pass.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";

import RegionVariable from "coral/regionck/RegionVariable";
import Ty from "coral/mir/ty/Ty";
import RefTy from "coral/mir/ty/RefTy";
import BuiltinTy from "coral/mir/ty/BuiltinTy";
import BorrowKind from "coral/mir/ty/BorrowKind";
import Regionck from "coral/regionck/Regionck";
import FnLifetimes from "coral/lifetimes/FnLifetimes";
import PathVarRef from "coral/mir/path/PathVarRef";
import PathDeref from "coral/mir/path/PathDeref";
import Loan from "coral/mir/Loan";
import Access from "coral/mir/Access";
import Path from "coral/mir/path/Path";
import {
    BinaryOp,
    BuiltinType,
    Call,
    Expression,
    FunctionJp,
    Joinpoint,
    ParenExpr,
    PointerType,
    QualType,
    ReturnStmt,
    Scope,
    Type,
    TypedefType,
    UnaryOp,
    Vardecl,
    Varref,
    WrapperStmt,
} from "clava-js/api/Joinpoints.js";
import CfgNodeType from "clava-js/api/clava/graphs/cfg/CfgNodeType.js";
import Query from "lara-js/api/weaver/Query.js";
import Declaration from "coral/mir/Declaration";
import SymbolTable from "coral/mir/symbols/SymbolTable";

export default class SymbolTableComputation extends Pass {
    protected override _name: string = this.constructor.name;

    baseSymbolTable: SymbolTable;
    
    constructor(baseSymbolTable: SymbolTable) {
        super();
        this.baseSymbolTable = new SymbolTable();
    }

    _apply_impl($jp: FunctionJp): PassResult {
        // Init scratch pad and annotate nodes with liveness
        for (const node of this.regionck.cfg.graph.nodes()) {
            const scratch = {
                liveIn: this.regionck.liveness.liveIn.get(node.id()) ?? new Set(),
                liveOut: this.regionck.liveness.liveOut.get(node.id()) ?? new Set(),
                accesses: [],
                declarations: [],
                inScopeLoans: new Set(),
            };

            node.scratch("_coral", scratch);
        }

        this.regionVarCounter = 1;
        this.#createUniversalRegions($jp);
        this.#annotateLifetimeTypes();
        delete this.fnLifetimes;

        return new PassResult(this, $jp);
    }

    #processNode(node: cytoscape.NodeSingular) {
        const inNodes = node
            .incomers()
            .nodes();
        
        let symbolTable: SymbolTable;
        if (inNodes.length === 0) {
            symbolTable = this.baseSymbolTable.clone();
        } else {
            symbolTable = SymbolTable.merge(inNodes.map(
                (inNode) => inNode.scratch("_coral").atExitSymbolTable
            ));
        }

        for (const decl of node.scratch("_coral").declarations as Declaration[]) {
            symbolTable.pushSymbol(decl);
        }

        node.scratch("_coral").symbolTable = symbolTable;

        const atExitSymbolTable = symbolTable.clone();

        for (const access of node.scratch("_coral").accesses as Access[]) {
            atExitSymbolTable.applyAccess(access);
        }
        
        const outNodes = node
            .outgoers()
            .nodes();
        
        if (outNodes.length === 1) {

        } else if (outNodes.length > 1) {
            
            // TODO
        } else {
            // TODO
        }
        
        node.scratch("_coral").atExitSymbolTable = atExitSymbolTable;
    }
}

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
import Assignment from "coral/mir/Assignment";
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
    Type,
    TypedefType,
    UnaryOp,
    Vardecl,
    Varref,
    WrapperStmt,
} from "clava-js/api/Joinpoints.js";
import CfgNodeType from "clava-js/api/clava/graphs/cfg/CfgNodeType.js";
import Query from "lara-js/api/weaver/Query.js";

export default class CfgAnnotator extends Pass {
    protected override _name: string = this.constructor.name;

    regionck: Regionck;
    regionVarCounter: number = 1;
    fnLifetimes: FnLifetimes | undefined;

    constructor(regionck: Regionck) {
        super();
        this.regionck = regionck;
    }

    #new_region_var(
        name: string = "",
        kind: RegionVariable.Kind = RegionVariable.Kind.EXISTENTIAL,
    ): RegionVariable {
        const id = this.regionVarCounter++;
        const rvar = new RegionVariable(
            id.toString(),
            kind,
            name === "" ? id.toString() : name,
        );
        this.regionck.regions.push(rvar);
        return rvar;
    }

    _apply_impl($jp: FunctionJp): PassResult {
        // Init scratch pad and annotate nodes with liveness
        for (const node of this.regionck.cfg.graph.nodes()) {
            const scratch = {
                liveIn: this.regionck.liveness.liveIn.get(node.id()) ?? new Set(),
                liveOut: this.regionck.liveness.liveOut.get(node.id()) ?? new Set(),
                accesses: [],
                inScopeLoans: new Set(),
                assignments: [],
            };

            node.scratch("_coral", scratch);
        }

        this.regionVarCounter = 1;
        this.#createUniversalRegions($jp);
        this.#annotateLifetimeTypes();
        delete this.fnLifetimes;

        return new PassResult(this, $jp);
    }

    #createUniversalRegions($jp: FunctionJp) {
        this.fnLifetimes = new FnLifetimes($jp);
        this.regionck.regions.push(
            new RegionVariable("0", RegionVariable.Kind.UNIVERSAL, "static"),
        );

        // Annotate param universal regions
        for (const $param of $jp.params) {
            const ty = this.#deconstructType($param.type, $param, false);
            $param.setUserField("ty", ty);
            this.regionck.declarations.set($param.name, ty);

            // TODO: Retrieve lifetimes from fnLifetimes
            // & Create multiple regionVars if needed

            const regionVar = this.#new_region_var();
            this.regionck.regions.push(regionVar);
        }
    }

    #annotateLifetimeTypes() {
        for (const node of this.regionck.cfg.graph.nodes()) {
            const data = node.data();

            switch (data.type) {
                case CfgNodeType.INST_LIST: {
                    const $stmt = data.stmts[0];
                    switch ($stmt.joinPointType) {
                        case "declStmt":
                            this.#annotateDeclStmt(node, $stmt.children[0]);
                            break;
                        case "exprStmt":
                            this.#annotateExprStmt(node, $stmt.children[0]);
                            break;
                        case "wrapperStmt":
                            this.#annotateWrapperStmt(node, $stmt.children[0]);
                    }
                    break;
                }
                case CfgNodeType.IF:
                    this.#annotateExprStmt(node, data.nodeStmt.cond);
                    break;
                case CfgNodeType.RETURN:
                    this.#annotateExprStmt(node, data.nodeStmt);
                    break;
                case CfgNodeType.SWITCH:
                    throw new Error("Unimplemented: Switch annotation");
            }
        }
    }

    #annotateDeclStmt(node: cytoscape.NodeSingular, $vardecl: Vardecl) {
        const ty = this.#deconstructType($vardecl.type, $vardecl, true);
        $vardecl.setUserField("ty", ty);
        const scratch = node.scratch("_coral");
        scratch.lhs = $vardecl;
        scratch.lhs_ty = ty;
        this.regionck.declarations.set($vardecl.name, ty);

        if ($vardecl.hasInit) {
            scratch.accesses.push(
                new Access(
                    new PathVarRef($vardecl, ty),
                    Access.Mutability.WRITE,
                    Access.Depth.SHALLOW,
                ),
            );

            this.#annotateExprStmt(node, $vardecl.init);
            this.#markAssignment(node, new PathVarRef($vardecl, ty));
        }
    }

    #markAssignment(node: cytoscape.NodeSingular, path: Path) {
        // TODO: Detect & Mark full copy/move (only if $expr represents a path?)

        node.scratch("_coral").assignment = new Assignment(path);
    }

    #deconstructType(
        $type: Type,
        $jp: Joinpoint,
        create_region_var: boolean = false,
    ): Ty {
        let isConst = false;
        let isRestrict = false;

        if ($type instanceof QualType) {
            if ($type.qualifiers.includes("const")) isConst = true;
            if ($type.qualifiers.includes("restrict")) isRestrict = true;
            $type = $type.unqualifiedType;
        }

        switch ($type.joinPointType) {
            case "builtinType":
                return new BuiltinTy(($type as BuiltinType).builtinKind, isConst);
            case "pointerType": {
                const inner = this.#deconstructType(
                    ($type as PointerType).pointee,
                    $jp,
                    create_region_var,
                );
                if (inner.isConst && isRestrict)
                    throw new Error("Cannot have a restrict pointer to a const type");

                return new RefTy(
                    inner.isConst ? BorrowKind.SHARED : BorrowKind.MUTABLE,
                    inner,
                    // TODO this is clearly wrong but I don't understand what's supposed to be here
                    create_region_var ? this.#new_region_var() : (undefined as any),
                    isConst,
                );
            }
            case "qualType":
                throw new Error(
                    "Unreachable: QualType cannot have a QualType as unqualified type",
                );
            case "typedefType":
                return this.#deconstructType(
                    ($type as TypedefType).underlyingType,
                    $jp,
                    create_region_var,
                );
            case "elaboratedType":
                // Inner should be instance of TagType, inner is
                // console.log($type.joinPointType);
                // console.log($type.qualifier);
                // console.log($type.keyword);
                // console.log("------------------");

                // console.log($type.namedType.joinPointType);
                // console.log($type.namedType.kind);
                // console.log($type.namedType.name);
                // console.log("------------------");

                // console.log($type.namedType.decl.joinPointType);
                // console.log($type.namedType.decl.kind);
                throw new Error("Unimplemented Elaborated type annotation");
            default:
                throw new Error(
                    "Unhandled deconstruct declstmt type: " + $type.joinPointType,
                );
        }
    }

    #annotateExprStmt(node: cytoscape.NodeSingular, $exprStmt: Joinpoint) {
        switch ($exprStmt.joinPointType) {
            case "literal":
            case "intLiteral":
            case "floatLiteral":
            case "boolLiteral":
                break;
            case "binaryOp":
                this.#annotateBinaryOp(node, $exprStmt as BinaryOp);
                break;
            case "unaryOp":
                this.#annotateUnaryOp(node, $exprStmt as UnaryOp);
                break;
            case "call":
                this.#annotateFunctionCall(node, $exprStmt as Call);
                break;
            case "varref": {
                const $varref = $exprStmt as Varref;
                const path = this.#parseLvalue(node, $varref);
                // const ty = $varref.declaration.getUserField("ty") as Ty;
                // TODO: DEEP WRITE only if moving value, should be implemented, but needs testing due to edge cases

                // TODO ty is not returning, that's a bug

                node.scratch("_coral").accesses.push(
                    new Access(
                        path,
                        Access.Mutability.READ,
                        // ty?.isCopyable ? Access.Mutability.READ : Access.Mutability.WRITE, // TODO this doesnt make sense
                        Access.Depth.DEEP,
                    ),
                );
                break;
            }
            case "parenExpr":
                throw new Error("Unimplemented: Paren expr annotation");
            case "returnStmt":
                this.#annotateExprStmt(node, ($exprStmt as ReturnStmt).returnExpr);
                break;
            default:
                throw new Error(
                    "Unhandled expression annotation for jp: " + $exprStmt.joinPointType,
                );
        }
    }

    #annotateBinaryOp(node: cytoscape.NodeSingular, $binaryOp: BinaryOp) {
        if ($binaryOp.isAssignment) {
            const path = this.#parseLvalue(node, $binaryOp.left);
            const scratch = node.scratch("_coral");
            scratch.accesses.push(
                new Access(path, Access.Mutability.WRITE, Access.Depth.SHALLOW),
            );

            this.#annotateExprStmt(node, $binaryOp.right);
            this.#markAssignment(node, path);

            return;
        }

        this.#annotateExprStmt(node, $binaryOp.left);
        this.#annotateExprStmt(node, $binaryOp.right);
    }

    #annotateUnaryOp(node: cytoscape.NodeSingular, $unaryOp: UnaryOp) {
        if ($unaryOp.operator === "&") {
            // Create loan, and start of an lvalue
            const loanedPath = this.#parseLvalue(node, $unaryOp.operand);
            const regionVar = this.#new_region_var();
            const loanedTy = loanedPath.ty;

            // Borrowkind depends on the assignment left value
            let parent = $unaryOp.parent;
            let leftTy;
            while (true) {
                if (parent instanceof BinaryOp && parent.isAssignment) {
                    leftTy = this.#parseLvalue(node, parent.left).ty;
                    break;
                }

                if (parent instanceof Vardecl) {
                    leftTy = this.regionck.declarations.get(parent.name);
                    break;
                }

                if (parent instanceof ParenExpr) {
                    throw new Error(
                        "annotateUnaryOp: Cannot determine assignment lvalue",
                    );
                }

                parent = parent.parent;
            }

            if (!(leftTy instanceof RefTy)) {
                throw new Error(
                    "annotateUnaryOp: Cannot borrow from non-reference type " +
                        leftTy?.toString(),
                );
            }

            const loan = new Loan(
                regionVar,
                leftTy,
                loanedTy,
                loanedPath,
                $unaryOp,
                node,
            );
            node.scratch("_coral").loan = loan;
            this.regionck.loans.push(loan);

            node.scratch("_coral").accesses.push(
                new Access(
                    loanedPath,
                    loan.borrowKind === BorrowKind.MUTABLE
                        ? Access.Mutability.MUTABLE_BORROW
                        : Access.Mutability.BORROW,
                    Access.Depth.DEEP,
                ),
            );

            // Mark Reborrows
            if (
                Query.searchFrom($unaryOp, "unaryOp", { operator: "*" }).get() !==
                undefined
            ) {
                node.scratch("_coral").reborrow = true;
            }
        } else if ($unaryOp.operator === "*") {
            // Start of an lvaue
            const path = this.#parseLvalue(node, $unaryOp);
            // TODO: Set correct AccessMutability and AccessDepth
            node.scratch("_coral").accesses.push(
                new Access(path, Access.Mutability.READ, Access.Depth.DEEP),
            );
        } else {
            // Not relevant, keep going
            this.#annotateExprStmt(node, $unaryOp.operand);
        }
    }

    #annotateFunctionCall(node: cytoscape.NodeSingular, $call: Call) {
        for (const $expr of $call.args) {
            const path = this.#parseLvalue(node, $expr);
            // TODO: Set correct AccessMutability and AccessDepth
            node.scratch("_coral").accesses.push(
                new Access(path, Access.Mutability.READ, Access.Depth.DEEP),
            );
            // TODO: Identify & mark moves
        }
    }

    #annotateWrapperStmt(node: cytoscape.NodeSingular, $wrapperStmt: WrapperStmt) {
        // TODO: Take care of Drops and StorageDeads
    }

    //--------------------------------
    #parseLvalue(node: cytoscape.NodeSingular, $jp: Joinpoint): Path {
        switch ($jp.joinPointType) {
            case "literal":
            case "intLiteral":
            case "floatLiteral":
            case "boolLiteral":
                throw new Error("Cannot parse lvalue from literal");
            case "varref": {
                const $varref = $jp as Varref;
                const ty = this.regionck.declarations.get($varref.name);
                if (ty === undefined) {
                    throw new Error("Variable " + $varref.name + " not found");
                }

                return new PathVarRef($varref, ty);
            }
            case "unaryOp": {
                const $unaryOp = $jp as UnaryOp;
                if ($unaryOp.operator === "*") {
                    const innerPath = this.#parseLvalue(node, $unaryOp.operand);
                    return new PathDeref($jp, innerPath);
                } else {
                    throw new Error(
                        "Unhandled parseLvalue unary op: " + $unaryOp.operator,
                    );
                }
            }
            case "memberAccess":
            case "parenExpr":
                return this.#parseLvalue(node, ($jp as ParenExpr).subExpr);
            default:
                throw new Error("Unhandled parseLvalue: " + $jp.joinPointType);
        }
    }
}

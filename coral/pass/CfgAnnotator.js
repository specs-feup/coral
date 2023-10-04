import Pass from "lara-js/api/lara/pass/Pass.js";

import RegionVariable from "../borrowck/RegionVariable.js";
import RegionKind from "../borrowck/RegionKind.js";
import Ty from "../ty/Ty.js";
import RefTy from "../ty/RefTy.js";
import BuiltinTy from "../ty/BuiltinTy.js";
import ElaboratedTy from "../ty/ElaboratedTy.js";
import BorrowKind from "../ty/BorrowKind.js";
import Regionck from "../borrowck/Regionck.js";
import PathVarRef from "../mir/path/PathVarRef.js";
import PathMemberAccess from "../mir/path/PathMemberAccess.js";
import PathDeref from "../mir/path/PathDeref.js";
import PathKind from "../mir/path/PathKind.js";
import Loan from "../mir/Loan.js";
import Access from "../mir/Access.js";
import AccessDepth from "../mir/AccessDepth.js";
import AccessMutability from "../mir/AccessMutability.js";
import Assignment from "../mir/Assignment.js";
import AssignmentKind from "../mir/AssignmentKind.js";
import FnLifetimes from "../lifetimes/FnLifetimes.js";
import CfgNodeType from "clava-js/api/clava/graphs/cfg/CfgNodeType.js";

export default class CfgAnnotator extends Pass {

    /**
     * @type {Regionck}
     */
    regionck;

    /**
     * @type {number}
     */
    regionVarCounter;
    /**
     * @type {FnLifetimes}
     */
    fnLifetimes;

    constructor(regionck) {
        super();
        this.regionck = regionck;
    }

    #new_region_var($expr, name="", kind=RegionKind.EXISTENTIAL) {
        const id = this.regionVarCounter++;
        const rvar = new RegionVariable(
            id,
            kind,
            name === "" ? id.toString() : name,
            $expr
        );
        this.regionck.regions.push(rvar);
        return rvar;
    }

    /**
     * Apply tranformation to
     * @param {JoinPoint} $jp Joint point on which the pass will be applied
     * @return {PassResult} Results of applying this pass to the given joint point
     */
    _apply_impl($jp) {
        // Init scratch pad and annotate nodes with liveness
        for (const node of this.regionck.cfg.graph.nodes()) {
            const scratch = {};
            scratch.liveIn = this.regionck.liveness.liveIn.get(node.id()) ?? new Set();
            scratch.liveOut = this.regionck.liveness.liveOut.get(node.id()) ?? new Set();
            scratch.accesses = [];
            scratch.inScopeLoans = new Set();
            scratch.assignments = [];

            node.scratch("_coral", scratch);
        }

        this.regionVarCounter = 1;
        this.#createUniversalRegions($jp);
        this.#annotateLifetimeTypes();
        delete this.fnLifetimes;
    }

    #createUniversalRegions($jp) {
        this.fnLifetimes = new FnLifetimes($jp);
        this.regionck.regions.push(new RegionVariable(0, RegionKind.UNIVERSAL, "static", undefined));
        
        // Annotate param universal regions
        for (const $param of $jp.params) {
            const ty = this.#deconstructType($param.type, $param, false);
            $param.setUserField("ty", ty);
            this.borrowck.declarations.set($param.name, ty);

            // TODO: Retrieve lifetimes from fnLifetimes
            // & Create multiple regionVars if needed

            const regionVar = this.#new_region_var($param);
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


    #annotateDeclStmt(node, $vardecl) {
        const ty = this.#deconstructType($vardecl.type, $vardecl, true);        
        $vardecl.setUserField("ty", ty);
        const scratch = node.scratch("_coral");
        scratch.lhs = $vardecl;
        scratch.lhs_ty = ty;
        this.regionck.declarations.set($vardecl.name, ty);

        if ($vardecl.hasInit) {
            scratch.accesses.push(new Access(
                new PathVarRef($vardecl, undefined),
                AccessMutability.WRITE,
                AccessDepth.SHALLOW
            ));

            this.#annotateExprStmt(node, $vardecl.init);
            this.#markAssignment(node, new PathVarRef($vardecl, undefined), ty, $vardecl.init);
        }
    }

    /**
     * 
     * @param {*} node 
     * @param {Path} path 
     * @param {Ty} ty 
     * @param {$expression} $expr The $expr being assigned to the path
     */
    #markAssignment(node, path, ty, $expr) {
        // TODO: Detect & Mark full copy/move (only if $expr represents a path?) 
        let assignmentKind = ty.isCopyable ? AssignmentKind.COPY : AssignmentKind.MOVE;
        if ($expr.instanceOf("literal")) {
            assignmentKind = AssignmentKind.LITERAL;
        }
        node.scratch('_coral').assignment = new Assignment(assignmentKind, path, ty);
    }

    #deconstructType($type, $jp, create_region_var=false) {        
        let isConst = false;
        let isRestrict = false;

        if ($type.instanceOf("qualType")) {
            if ($type.qualifiers.includes("const"))
                isConst = true;
            if ($type.qualifiers.includes("restrict"))
                isRestrict = true;
            $type = $type.unqualifiedType;
        }


        switch ($type.joinPointType) {
            case "builtinType":
                return new BuiltinTy($type.builtinKind, isConst);
            case "pointerType": {
                const inner = this.#deconstructType($type.pointee, $jp, create_region_var);
                if (inner.isConst && isRestrict)
                    throw new Error("Cannot have a restrict pointer to a const type");

                return new RefTy(
                    inner.isConst ? BorrowKind.SHARED : BorrowKind.MUTABLE,
                    inner,
                    create_region_var ? this.#new_region_var($jp) : undefined,
                    isConst
                );
            }
            case "qualType":
                throw new Error("Unreachable: QualType cannot have a QualType as unqualified type");
            case "typedefType":
                return this.#deconstructType($type.underlyingType, $jp, create_region_var);
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
                throw new Error("Unhandled deconstruct declstmt type: " + $type.joinPointType);

        }
    }


    #annotateExprStmt(node, $exprStmt) {
        switch ($exprStmt.joinPointType) {
            case "literal":
            case "intLiteral":
            case "floatLiteral":
            case "boolLiteral":
                break;
            case "binaryOp":
                this.#annotateBinaryOp(node, $exprStmt);
                break;
            case "unaryOp":
                this.#annotateUnaryOp(node, $exprStmt);
                break;
            case "call":
                this.#annotateFunctionCall(node, $exprStmt);
                break;
            case "varref": {
                const path = this.#parseLvalue(node, $exprStmt);
                const ty = $exprStmt.declaration.getUserField("ty");
                // TODO: DEEP WRITE only if moving value, should be implemented, but needs testing due to edge cases
                node.scratch("_coral").accesses.push(new Access(
                    path,
                    ty.isCopyable ? AccessMutability.READ : AccessMutability.WRITE,
                    AccessDepth.DEEP
                ));
                break;
            }
            case "parenExpr":
                throw new Error("Unimplemented: Paren expr annotation");
            case "returnStmt":
                this.#annotateExprStmt(node, $exprStmt.returnExpr);
                break;
            default:
                console.log("Unhandled expression annotation for jp: " + $exprStmt.joinPointType);
        }
    }

    
    #annotateBinaryOp(node, $binaryOp) {
        if ($binaryOp.isAssignment) {
            const path = this.#parseLvalue(node, $binaryOp.left);
            const ty = path.retrieveTy(this.regionck);
            const scratch = node.scratch("_coral");
            scratch.accesses.push(new Access(path, AccessMutability.WRITE, AccessDepth.SHALLOW));
            
            this.#annotateExprStmt(node, $binaryOp.right);
            this.#markAssignment(node, path, ty, $binaryOp.right);

            return;
        }

        this.#annotateExprStmt(node, $binaryOp.left);
        this.#annotateExprStmt(node, $binaryOp.right);
    }


    #annotateUnaryOp(node, $unaryOp) {
        if ($unaryOp.operator === "&") {
            // Create loan, and start of an lvalue
            const loanedPath = this.#parseLvalue(node, $unaryOp.operand);
            const regionVar = this.#new_region_var($unaryOp);
            const loanedTy = loanedPath.retrieveTy(this.regionck);

            // Borrowkind depends on the assignment left value
            let assignment = $unaryOp.parent;
            while (assignment.joinPointType !== "binaryOp" || !assignment.isAssignment) {
                assignment = assignment.parent;
            }

            const leftTy = this.#parseLvalue(node, assignment.left).retrieveTy(this.regionck);
            if (!(leftTy instanceof RefTy)) {
                throw new Error("annotateUnaryOp: Cannot borrow from non-reference type " + leftTy.toString());
            }

            const loan = new Loan(regionVar, leftTy, loanedTy, loanedPath, $unaryOp, node);
            node.scratch("_coral").loan = loan;
            this.regionck.loans.push(loan);

            node.scratch("_coral").accesses.push(new Access(
                loanedPath,
                loan.borrowKind === BorrowKind.MUTABLE ? AccessMutability.WRITE : AccessMutability.READ,
                AccessDepth.DEEP
            ));

            // TODO: I think I'm missing something here
        } else if ($unaryOp.operator === "*") {
            // Start of an lvaue
            const path = this.#parseLvalue(node, $unaryOp);
            // TODO: Set correct AccessMutability and AccessDepth
            node.scratch("_coral").accesses.push(new Access(
                path,
                AccessMutability.READ,
                AccessDepth.DEEP
            ));
        } else {
            // Not relevant, keep going
            this.#annotateExprStmt(node, $unaryOp.operand);
        }
    }


    #annotateFunctionCall(node, $call) {
        for (const $expr of $call.args) {
            const path = this.#parseLvalue(node, $expr);
            // TODO: Set correct AccessMutability and AccessDepth
            node.scratch("_coral").accesses.push(new Access(
                path,
                AccessMutability.READ,
                AccessDepth.DEEP
            ));
            // TODO: Identify & mark moves
        }
    }


    #annotateWrapperStmt(node, $wrapperStmt) {
        // TODO: Take care of Drops and StorageDeads
    }





    //--------------------------------
    /**
     * 
     * @param {*} node 
     * @param {JoinPoint} $jp 
     * @returns {Path}
     */
    #parseLvalue(node, $jp) {
        switch ($jp.joinPointType) {
            case "literal":
            case "intLiteral":
            case "floatLiteral":
            case "boolLiteral":
                return undefined;
            case "varref":
                return new PathVarRef($jp, undefined);
            case "unaryOp":
                if ($jp.operator === "*") {
                    let innerPath = this.#parseLvalue(node, $jp.operand);
                    let ty = innerPath.retrieveTy(this.regionck);
                    if (!(ty instanceof RefTy))
                        throw new Error("Cannot dereference non-reference type " + ty.toString());
                    return new PathDeref($jp, innerPath, ty.borrowKind);
                }
                else {
                    throw new Error("Unhandled parseLvalue unary op: " + $jp.operator);
                }
            case "memberAccess":
            case "parenExpr":
                return this.#parseLvalue(node, $jp.subExpr);
            default:
                throw new Error("Unhandled parseLvalue: " + $jp.joinPointType);
        }   
    }
}
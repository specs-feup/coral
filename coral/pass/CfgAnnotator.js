laraImport("lara.pass.Pass");

laraImport("coral.borrowck.RegionVariable");
laraImport("coral.ty.Ty");
laraImport("coral.ty.RefTy");
laraImport("coral.ty.BorrowKind");

laraImport("coral.borrowck.Regionck");

laraImport("coral.mir.path.PathVarRef");
laraImport("coral.mir.path.PathMemberAccess");
laraImport("coral.mir.path.PathDeref");
laraImport("coral.mir.path.PathKind");

laraImport("coral.mir.Loan");
laraImport("coral.mir.Access");

class CfgAnnotator extends Pass {

    regionck;
    liveness;
    cfg;

    constructor(regionck) {
        super();
        this.regionck = regionck;
        this.liveness = regionck.liveness;
        this.cfg = regionck.cfg;
    }

    #new_region_var($expr, name="", kind=RegionKind.EXISTENTIAL) {
        const id = this.regionck.regions.length + 1;
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
        for (const node of this.cfg.graph.nodes()) {
            const scratch = {};
            scratch.liveIn = this.liveness.liveIn.get(node.id()) ?? new Set();
            scratch.liveOut = this.liveness.liveOut.get(node.id()) ?? new Set();
            scratch.accesses = [];
            scratch.inScopeLoans = [];

            node.scratch("_coral", scratch);
        }

        this.#annotateLifetimeTypes();
    }

    #annotateLifetimeTypes() {
        for (const node of this.cfg.graph.nodes()) {
            const data = node.data();
            if (data.type !== CfgNodeType.INST_LIST)
                continue;

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
        }
    }


    #annotateDeclStmt(node, $vardecl) {
        const ty = this.#deconstructType($vardecl.type, $vardecl, true);        
        $vardecl.setUserField("ty", ty);
        node.scratch("_coral").lhs = $vardecl;
        node.scratch("_coral").lhs_ty = ty;

        if ($vardecl.hasInit) {
            this.#annotateExprStmt(node, $vardecl.init);
            // TODO: Subtyping constraint
        }
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
                return new Ty($type.builtinKind, true, isConst);
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
                // println($type.joinPointType);
                // println($type.qualifier);
                // println($type.keyword);
                // println("------------------");  

                // println($type.namedType.joinPointType);
                // println($type.namedType.kind);
                // println($type.namedType.name);
                // println("------------------");

                // println($type.namedType.decl.joinPointType);
                // println($type.namedType.decl.kind);
                throw new Error("TODO: Elaborated type annotation");
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
            case "varRef": {
                const path = this.#parseLvalue(node, $exprStmt);
                // TODO: Set correct AccessMutability and AccessDepth depending on if type is copiable or not
                node.scratch("_coral").accesses.push(new Access(
                    path,
                    AccessMutability.READ,
                    AccessDepth.DEEP
                ));
                break;
            }
            case "parenExpr":
                throw new Error("TODO: Paren expr annotation");
            case "returnStmt":
                this.#annotateExprStmt(node, $exprStmt.returnExpr);
                break;
            default:
                println("Unhandled expression annotation for jp: " + $exprStmt.joinPointType);
        }
    }


    // #annotateRhs(node, $expr) {
    //     if ($expr.instanceOf("unaryOp") && $expr.operator === "&") {
    //         println("TODO: BORROW: " + $expr.code);
    //     } else {
    //         println("TODO: Unhandled annotate rhs for jp: " + $expr.joinPointType);
    //     }
    // }

    #annotateBinaryOp(node, $binaryOp) {
        if ($binaryOp.isAssignment) {
            const path = this.#parseLvalue(node, $binaryOp.left);
            println(node.id(), Object.keys(node.scratch("_coral")).join(' '));
            node.scratch("_coral").accesses.push(new Access(path, AccessMutability.WRITE, AccessDepth.SHALLOW));
            this.#annotateExprStmt(node, $binaryOp.right);
            return;
        }

        // TODO: Something missing here...
        
        this.#parseLvalue(node, $binaryOp.left);
        this.#parseLvalue(node, $binaryOp.right);

        // node.scratch("_coral").lhs = $binaryOp.left;
        // const ty = this.#annotateRhs(node, $binaryOp.right);
    }


    #annotateUnaryOp(node, $unaryOp) {
        if ($unaryOp.operator === "&") {
            // Create loan, and start of an lvalue
            const path = this.#parseLvalue(node, $unaryOp.operand);

            const regionVar = this.#new_region_var($unaryOp);
            // TODO: Retrieve type + borrow kind
            const ty = new Ty("INCOMPLETE", true);
            const borrowKind = BorrowKind.SHARED;
            
            const loan = new Loan(regionVar, borrowKind, ty, path, $unaryOp);
            node.scratch("_coral").loan = loan;
            node.scratch("_coral").accesses.push(new Access(
                path,
                borrowKind === BorrowKind.MUTABLE ? AccessMutability.WRITE : AccessMutability.READ,
                AccessDepth.DEEP
            ));
            this.regionck.loans.push(loan);

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
        println("TODO: Function call annotation");
    }


    #annotateWrapperStmt(node, $wrapperStmt) {
        println("TODO: Wrapper stmt annotation");
    }





    //--------------------------------
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
                if ($jp.operator === "*")
                    return new PathDeref($jp, this.#parseLvalue(node, $jp.operand));
                else
                    throw new Error("Unhandled parseLvalue unary op: " + $jp.operator);
            case "memberAccess":
            case "parenExpr":
                return this.#parseLvalue(node, $jp.subExpr);
            default:
                throw new Error("Unhandled parseLvalue: " + $jp.joinPointType);
        }   
    }
}
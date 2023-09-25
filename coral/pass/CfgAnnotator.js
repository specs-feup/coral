laraImport("lara.pass.Pass");

laraImport("coral.borrowck.RegionVariable");
laraImport("coral.ty.Ty");
laraImport("coral.ty.RefTy");
laraImport("coral.ty.BuiltinTy");
laraImport("coral.ty.ElaboratedTy");
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

    regionVarCounter;
    fnLifetimes;

    constructor(regionck) {
        super();
        this.regionck = regionck;
        this.liveness = regionck.liveness;
        this.cfg = regionck.cfg;
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
        for (const node of this.cfg.graph.nodes()) {
            const scratch = {};
            scratch.liveIn = this.liveness.liveIn.get(node.id()) ?? new Set();
            scratch.liveOut = this.liveness.liveOut.get(node.id()) ?? new Set();
            scratch.accesses = [];
            scratch.inScopeLoans = [];

            node.scratch("_coral", scratch);
        }

        this.regionVarCounter = 1;
        this.#createUniversalRegions();
        this.#annotateParams($jp);
        this.#annotateLifetimeTypes();
        delete this.fnLifetimes;
    }

    #createUniversalRegions() {
        this.fnLifetimes = new FnLifetimes($jp);
        this.regionck.regions.push(new RegionVariable(0, RegionKind.UNIVERSAL, "static", undefined));
        

    }

    #annotateParams($jp) {
        for (const $param of $jp.params) {
            const ty = this.#deconstructType($param.type, $param, false);
            $param.setUserField("ty", ty);
            
            const regionVar = this.#new_region_var($param);
            this.regionck.loans.push(loan);
        }
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
        const scratch = node.scratch("_coral");
        scratch.lhs = $vardecl;
        scratch.lhs_ty = ty;


        if ($vardecl.hasInit) {
            scratch.accesses.push(new Access(
                new PathVarRef($vardecl, undefined),
                AccessMutability.WRITE,
                AccessDepth.SHALLOW
            ));

            this.#annotateExprStmt(node, $vardecl.init);
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
            case "varRef": {
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
                println("Unhandled expression annotation for jp: " + $exprStmt.joinPointType);
        }
    }

    
    #annotateBinaryOp(node, $binaryOp) {
        if ($binaryOp.isAssignment) {
            // TODO: Need to handle a move 
            const path = this.#parseLvalue(node, $binaryOp.left);
            node.scratch("_coral").accesses.push(new Access(path, AccessMutability.WRITE, AccessDepth.SHALLOW));
            this.#annotateExprStmt(node, $binaryOp.right);
            return;
        }

        this.#annotateExprStmt(node, $binaryOp.left);
        this.#annotateExprStmt(node, $binaryOp.right);
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
        for (const $expr of $call.args) {
            const path = this.#parseLvalue(node, $expr);
            // TODO: Set correct AccessMutability and AccessDepth
            node.scratch("_coral").accesses.push(new Access(
                path,
                AccessMutability.READ,
                AccessDepth.DEEP
            ));
        }
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
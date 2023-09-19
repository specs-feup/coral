laraImport("lara.pass.Pass");

laraImport("coral.borrowck.RegionVariable");
laraImport("coral.ty.Ty");
laraImport("coral.ty.RefTy");
laraImport("coral.ty.BorrowKind");

laraImport("coral.borrowck.Regionck");

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
            node.scratch("_coral", {});
            node.scratch("_coral").liveIn = this.liveness.liveIn.get(node.id());
            node.scratch("_coral").liveOut = this.liveness.liveOut.get(node.id());
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
            this.#annotateRhs(node, $vardecl.init);
            // TODO: Subtyping constraint
        }
    }

    #deconstructType(type, $jp, create_region_var=false) {        
        let isConst = false;
        let isRestrict = false;

        if (type.instanceOf("qualType")) {
            if (type.qualifiers.includes("const"))
                isConst = true;
            if (type.qualifiers.includes("restrict"))
                isRestrict = true;
            type = type.unqualifiedType;
        }

        switch (type.joinPointType) {
            case "builtinType":
                return new Ty(type.builtinKind, isConst);
            case "pointerType": {
                const inner = this.#deconstructType(type.pointee, $jp, create_region_var);
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
            default:
                println("Unhandled deconstruct declstmt type: " + type.joinPointType);

        }
    }


    #annotateExprStmt(node, $exprStmt) {
        if ($exprStmt.instanceOf("call")) {
            this.#annotateFunctionCall(node, $exprStmt);
        } else if ($exprStmt.instanceOf("binaryOp")) {
           
            if (!$exprStmt.isAssignment) {
                return this.#annotateRhs(node, $exprStmt);
            }

            const $lhs = $exprStmt.children[0];
            node.scratch("_coral").lhs = $lhs;

            const ty = this.#annotateRhs(node, $rhs);
            // TODO: Create loan if needed? Check typings?

        } else if ($exprStmt.instanceOf("returnStmt")) {
            println("TODO: Return stmt annotation");
        } else {
            println("Unhandled expression annotation for jp: " + $exprStmt.joinPointType);
        }
    }


    #annotateRhs(node, $expr) {
        if ($expr.instanceOf("unaryOp") && $expr.operator === "&") {
            println("TODO: BORROW: " + $expr.code);
        } else {
            println("TODO: Unhandled annotate rhs for jp: " + $expr.joinPointType);
        }
    }


    #annotateFunctionCall(node, $call) {
        
    }


    #annotateWrapperStmt(node, $wrapperStmt) {
    
    }
}
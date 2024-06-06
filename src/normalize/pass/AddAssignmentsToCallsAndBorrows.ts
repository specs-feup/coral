import {
    BinaryOp,
    Call,
    ExprStmt,
    Expression,
    Joinpoint,
    ParenExpr,
    PointerType,
    Statement,
} from "clava-js/api/Joinpoints.js";
import ClavaJoinPoints from "clava-js/api/clava/ClavaJoinPoints.js";
import CoralNormalizer from "coral/normalize/CoralNormalizer";
import Query from "lara-js/api/weaver/Query.js";

export default class AddAssignmentsToCallsAndBorrows implements CoralNormalizer.Pass {
    tempVarCounter: number;
    #varNamePrefix: string;

    constructor(tempVarCounter: number = 0, varNamePrefix: string = "__coral_tmp_") {
        this.tempVarCounter = tempVarCounter;
        this.#varNamePrefix = varNamePrefix;
    }

    apply($jp: Joinpoint) {
        if (!($jp instanceof Statement)) {
            for (const $stmt of Query.searchFrom($jp, "statement")) {
                this.apply($stmt as Statement);
            }
            return;
        }

        if ($jp instanceof ExprStmt) {
            const neededNormalization = this.#addAssignmentToCalls($jp);

            if (!neededNormalization) {
                this.#addAssignmentToBorrows($jp);
            }
        }
    }

    #getTempVarName() {
        return `${this.#varNamePrefix}${this.tempVarCounter++}`;
    }

    #addAssignmentToCalls(
        $targetStmt: ExprStmt,
        $expr: Expression = $targetStmt.expr,
    ): boolean {
        if ($expr instanceof Call) {
            if ($expr.returnType.desugarAll.code === "void") {
                return false;
            }

            const varName = this.#getTempVarName();
            const $vardecl = ClavaJoinPoints.varDecl(varName, $targetStmt.expr);
            $targetStmt.replaceWith($vardecl);
            if (!$expr.returnType.isPointer) {
                $vardecl.insertAfter(
                    ClavaJoinPoints.exprStmt(ClavaJoinPoints.varRef($vardecl)),
                );
            }

            return true;
        } else if ($expr instanceof ParenExpr) {
            return this.#addAssignmentToCalls($targetStmt, $expr.subExpr);
        }

        return false;
    }

    #addAssignmentToBorrows($targetStmt: ExprStmt): boolean {
        const $expr = $targetStmt.expr;
        if ($expr instanceof BinaryOp && $expr.isAssignment) {
            return false;
        }

        if ($expr.type.isPointer) {
            const varName = this.#getTempVarName();
            const $vardecl = ClavaJoinPoints.varDecl(varName, $targetStmt.expr);
            const $vardeclType = $vardecl.type.desugarAll.copy();
            if ($vardeclType instanceof PointerType) {
                $vardeclType.pointee = $vardeclType.pointee.asConst();
                $vardecl.type = $vardeclType;
            }
            $targetStmt.replaceWith($vardecl);

            return true;
        } else {
            return false;
        }
    }
}

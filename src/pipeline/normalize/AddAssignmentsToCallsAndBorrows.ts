import {
    BinaryOp,
    Call,
    ExprStmt,
    Expression,
    ParenExpr,
    PointerType,
} from "@specs-feup/clava/api/Joinpoints.js";
import ClavaJoinPoints from "@specs-feup/clava/api/clava/ClavaJoinPoints.js";
import { NormalizationContext, NormalizationPass } from "@specs-feup/coral/pipeline/CoralNormalizer";

export default class AddAssignmentsToCallsAndBorrows implements NormalizationPass<typeof ExprStmt> {
    query = ExprStmt;

    apply($jp: ExprStmt, context: NormalizationContext) {
        const neededNormalization = this.#addAssignmentToCalls(context, $jp);

        if (!neededNormalization) {
            this.#addAssignmentToBorrows(context, $jp);
        }
    }

    #addAssignmentToCalls(
        context: NormalizationContext,
        $targetStmt: ExprStmt,
        $expr: Expression = $targetStmt.expr,
    ): boolean {
        if ($expr instanceof Call) {
            if ($expr.returnType.desugarAll.code === "void") {
                return false;
            }

            const $vardecl = ClavaJoinPoints.varDecl(context.generateVarName(), $targetStmt.expr);
            $targetStmt.replaceWith($vardecl);
            if (!$expr.returnType.isPointer) {
                $vardecl.insertAfter(
                    ClavaJoinPoints.exprStmt(ClavaJoinPoints.varRef($vardecl)),
                );
            }

            return true;
        } else if ($expr instanceof ParenExpr) {
            return this.#addAssignmentToCalls(context, $targetStmt, $expr.subExpr);
        }

        return false;
    }

    #addAssignmentToBorrows(
        context: NormalizationContext,
        $targetStmt: ExprStmt,
    ): boolean {
        const $expr = $targetStmt.expr;
        if ($expr instanceof BinaryOp && $expr.isAssignment) {
            return false;
        }

        if ($expr.type.isPointer) {
            const $vardecl = ClavaJoinPoints.varDecl(context.generateVarName(), $targetStmt.expr);
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

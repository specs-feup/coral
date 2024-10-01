import {
    BinaryOp,
    Call,
    Cast,
    Continue,
    DeclStmt,
    ExprStmt,
    Expression,
    If,
    Joinpoint,
    Literal,
    Loop,
    MemberAccess,
    ParenExpr,
    PointerType,
    QualType,
    ReturnStmt,
    Statement,
    Switch,
    TernaryOp,
    Type,
    UnaryExprOrType,
    UnaryOp,
    Vardecl,
    Varref,
} from "@specs-feup/clava/api/Joinpoints.js";
import ClavaJoinPoints from "@specs-feup/clava/api/clava/ClavaJoinPoints.js";
import CoralNormalizer from "coral/normalize/CoralNormalizer";
import Query from "@specs-feup/lara/api/weaver/Query.js";

export default class SplitExpressions implements CoralNormalizer.Pass {
    tempVarCounter: number;
    #varNamePrefix: string;
    #labelSuffix: string;
    labelCounter: number;

    constructor(
        tempVarCounter: number = 0,
        labelCounter: number = 0,
        varNamePrefix: string = "__coral_tmp_",
        labelSuffix: string = "__coral_label_",
    ) {
        this.tempVarCounter = tempVarCounter;
        this.#varNamePrefix = varNamePrefix;
        this.labelCounter = labelCounter;
        this.#labelSuffix = labelSuffix;
    }

    apply($jp: Joinpoint) {
        if (!($jp instanceof Statement)) {
            for (const $stmt of Query.searchFrom($jp, "statement")) {
                this.apply($stmt as Statement);
            }
            return;
        }

        if ($jp.parent instanceof Loop) {
            // While loops have a statement jointpoint for the condition
            // which should not be considered a statement
            return;
        }

        if ($jp instanceof Switch) {
            this.#splitNonLvalue($jp, $jp.condition);
        } else if ($jp instanceof If) {
            this.#splitNonLvalue($jp, $jp.cond);
        } else if ($jp instanceof Loop) {
            if ($jp.kind === "while") {
                const label = ClavaJoinPoints.labelDecl(this.#getLabelName());
                $jp.insertBefore(ClavaJoinPoints.labelStmt(label));
                this.#splitNonLvalue($jp, ($jp.cond as ExprStmt).expr);

                $jp.body.insertEnd(ClavaJoinPoints.gotoStmt(label));
                for (const $continueJp of Query.searchFrom($jp, "continue")) {
                    const $continue = $continueJp as Continue;
                    let $parentLoop: Joinpoint = $continue.parent;
                    while (!($parentLoop instanceof Loop)) {
                        $parentLoop = $parentLoop.parent;
                    }
                    if ($parentLoop.astId !== $jp.astId) {
                        continue;
                    }
                    ($continueJp as Continue).replaceWith(ClavaJoinPoints.gotoStmt(label));
                }
            } else if ($jp.kind === "dowhile") {
                const $condGenerator = $jp.cond.copy() as Statement;
                $jp.body.insertEnd($condGenerator);
                const label = ClavaJoinPoints.labelDecl(this.#getLabelName());
                $condGenerator.insertBefore(ClavaJoinPoints.labelStmt(label));
                this.#splitNonLvalue($condGenerator, ($jp.cond as ExprStmt).expr);
                
                // `while` cannot use variables declared inside the `do` scope
                const $vardecl = ClavaJoinPoints.varDeclNoInit(this.#getTempVarName(), ($jp.cond as ExprStmt).expr.type);
                $jp.insertBefore($vardecl);
                $condGenerator.insertBefore(
                    ClavaJoinPoints.exprStmt(
                        ClavaJoinPoints.assign(
                            ClavaJoinPoints.varRef($vardecl),
                            ($jp.cond as ExprStmt).expr,
                        ),
                    ),
                );
                $condGenerator.detach();
                ($jp.cond as ExprStmt).expr.replaceWith(ClavaJoinPoints.varRef($vardecl));
                

                for (const $continueJp of Query.searchFrom($jp, "continue")) {
                    const $continue = $continueJp as Continue;
                    let $parentLoop: Joinpoint = $continue.parent;
                    while (!($parentLoop instanceof Loop)) {
                        $parentLoop = $parentLoop.parent;
                    }
                    if ($parentLoop.astId !== $jp.astId) {
                        continue;
                    }
                    ($continueJp as Continue).replaceWith(ClavaJoinPoints.gotoStmt(label));
                }
            }
        } else if ($jp instanceof ReturnStmt) {
            this.#splitNonLvalue($jp, $jp.returnExpr);
        } else if ($jp instanceof DeclStmt) {
            for (const $vardecl of $jp.decls) {
                if ($vardecl instanceof Vardecl && $vardecl.hasInit) {
                    this.#splitInner($jp, $vardecl.init);
                }
            }
        } else if ($jp instanceof ExprStmt) {
            let $expr = $jp.expr;
            while ($expr instanceof ParenExpr) {
                $expr = $expr.subExpr;
            }

            if ($expr instanceof BinaryOp && $expr.isAssignment) {
                this.#splitEverything($jp, $expr.right);
                this.#splitNonLvalue($jp, $expr.left);
            } else {
                this.#splitInner($jp, $expr);
            }
        }
    }

    #splitEverything($targetStmt: Statement, $expr: Expression) {
        if ($expr instanceof ParenExpr) {
            this.#splitEverything($targetStmt, $expr.subExpr);
        } else if (!($expr instanceof Literal)) {
            this.#split($targetStmt, $expr);
        }
    }

    #splitNonLvalue($targetStmt: Statement, $expr: Expression) {
        if ($expr instanceof ParenExpr) {
            this.#splitNonLvalue($targetStmt, $expr.subExpr);
        } else if ($expr instanceof MemberAccess) {
            this.#splitNonLvalue($targetStmt, $expr.base);
        } else if ($expr instanceof UnaryOp) {
            if ($expr.operator === "*") {
                this.#splitNonLvalue($targetStmt, $expr.operand);
            } else {
                this.#split($targetStmt, $expr);
            }
        } else if (
            $expr instanceof TernaryOp ||
            $expr instanceof BinaryOp ||
            $expr instanceof Call ||
            $expr instanceof Cast
        ) {
            this.#split($targetStmt, $expr);
        }
    }

    #splitInner($targetStmt: Statement, $expr: Expression): Expression {
        if ($expr instanceof ParenExpr) {
            this.#splitInner($targetStmt, $expr.subExpr);
        } else if ($expr instanceof MemberAccess) {
            this.#splitNonLvalue($targetStmt, $expr.base);
        } else if ($expr instanceof UnaryExprOrType) {
            const inner = $expr.children[0];
            if ($expr.children.length > 0 && $expr.children[0] instanceof Expression) {
                this.#splitNonLvalue($targetStmt, $expr.children[0]);
            }
        } else if ($expr instanceof UnaryOp) {
            this.#splitNonLvalue($targetStmt, $expr.operand);
            if (
                $expr.kind === "post_inc" ||
                $expr.kind === "post_dec" ||
                $expr.kind === "pre_inc" ||
                $expr.kind === "pre_dec"
            ) {
                const operator = ($expr.kind === "post_inc" || $expr.kind === "pre_inc") ? "+" : "-";
                const $vardecl = ClavaJoinPoints.varDecl(
                    this.#getTempVarName(),
                    $expr.operand,
                );
                const $assign = ClavaJoinPoints.exprStmt(
                    ClavaJoinPoints.assign(
                        $expr.operand,
                        ClavaJoinPoints.binaryOp(
                            operator,
                            ClavaJoinPoints.varRef($vardecl),
                            ClavaJoinPoints.integerLiteral(1),
                        ),
                    ),
                );
                $targetStmt.insertBefore($vardecl);
                $targetStmt.insertBefore($assign);

                const $newExpr =
                    ($expr.kind === "post_inc" || $expr.kind === "post_dec")
                        ? ClavaJoinPoints.varRef($vardecl)
                        : $expr.operand;
                $expr.replaceWith($newExpr);
                return ($expr.kind === "post_inc" || $expr.kind === "post_dec")
                    ? ClavaJoinPoints.varRef($vardecl)
                    : $expr.operand;
            }
        } else if ($expr instanceof BinaryOp) {
            if ($expr.isAssignment) {
                const $varref = this.#split($targetStmt, $expr.right);
                this.#splitNonLvalue($targetStmt, $expr.left);

                const $assign = ClavaJoinPoints.exprStmt(
                    ClavaJoinPoints.assign($expr.left, $varref),
                );

                $targetStmt.insertBefore($assign);
                $expr.replaceWith($varref);
                return $varref;
            } else if ($expr.operator === ",") {
                this.#split($targetStmt, $expr.left);
                this.#splitInner($targetStmt, $expr.right);
                $expr.replaceWith($expr.right);
                return $expr.right;
            } else {
                this.#splitEverything($targetStmt, $expr.left);
                this.#splitEverything($targetStmt, $expr.right);
            }
        } else if ($expr instanceof TernaryOp) {
            const $resultVardecl = ClavaJoinPoints.varDeclNoInit(
                this.#getTempVarName(),
                $expr.trueExpr.type,
            );

            if (this.#canBeConst($expr)) {
                const $vardeclType = $resultVardecl.type.desugarAll.copy();
                if ($vardeclType instanceof PointerType) {
                    $vardeclType.pointee = $vardeclType.pointee.asConst();
                    $resultVardecl.type = $vardeclType;
                }
            }

            $targetStmt.insertBefore($resultVardecl);
            const $resultVarref = ClavaJoinPoints.varRef($resultVardecl);

            const $thenGenerator = ClavaJoinPoints.comment("ifTrue").stmt;
            const $elseGenerator = ClavaJoinPoints.comment("ifFalse").stmt;
            const $ifStmt = ClavaJoinPoints.ifStmt(
                this.#split($targetStmt, $expr.cond),
                $thenGenerator,
                $elseGenerator,
            );

            const $trueVarref = this.#split($thenGenerator, $expr.trueExpr);
            $thenGenerator.insertBefore(
                ClavaJoinPoints.assign($resultVarref, $trueVarref),
            );

            const $falseVarref = this.#split($elseGenerator, $expr.falseExpr);
            $elseGenerator.insertBefore(
                ClavaJoinPoints.assign($resultVarref, $falseVarref),
            );

            $thenGenerator.detach();
            $elseGenerator.detach();

            $targetStmt.insertBefore($ifStmt);
            $expr.replaceWith($resultVarref);

            return ClavaJoinPoints.varRef($resultVardecl);
        } else if ($expr instanceof Call) {
            // Reborrows should be last
            // https://rustc-dev-guide.rust-lang.org/borrow_check/two_phase_borrows.html
            const lastArgs: Expression[] = [];
            for (const $arg of $expr.args) {
                if (this.#isLvalue($arg) && $arg.type.isPointer) {
                    lastArgs.push($arg);
                } else {
                    this.#splitEverything($targetStmt, $arg);
                }
            }

            for (const $arg of lastArgs) {
                this.#splitEverything($targetStmt, $arg);
            }
        } else if ($expr instanceof Cast) {
            this.#splitNonLvalue($targetStmt, $expr.subExpr);
        }

        return $expr;
    }

    #getTempVarName() {
        return `${this.#varNamePrefix}${this.tempVarCounter++}`;
    }

    #getLabelName() {
        return `${this.#labelSuffix}${this.labelCounter++}`;
    }

    #split($targetStmt: Statement, $expr: Expression): Expression {
        $expr = this.#splitInner($targetStmt, $expr);
        if ($expr.parent !== undefined) {
            const varName = this.#getTempVarName();
            const $vardecl = ClavaJoinPoints.varDecl(varName, $expr);

            if (($expr instanceof UnaryOp && $expr.operator === "&") || $expr instanceof Varref) {
                if (this.#canBeConst($expr)) {
                    let $vardeclType = $vardecl.type.desugarAll;
                    while ($vardeclType instanceof QualType) {
                        $vardeclType = $vardeclType.unqualifiedType;
                    }
                    $vardeclType = $vardeclType.copy() as Type;
                    if ($vardeclType instanceof PointerType) {
                        $vardeclType.pointee = $vardeclType.pointee.asConst();
                        $vardecl.type = $vardeclType;
                    }
                }
            }

            $targetStmt.insertBefore($vardecl);
            const $varref = ClavaJoinPoints.varRef($vardecl);
            $expr.replaceWith($varref);
            return $varref;
        }

        return $expr;
    }

    #isLvalue($expr: Expression): boolean {
        if ($expr instanceof Varref) {
            return true;
        } else if ($expr instanceof ParenExpr) {
            return this.#isLvalue($expr.subExpr);
        } else if ($expr instanceof UnaryOp) {
            if ($expr.operator === "*") {
                return this.#isLvalue($expr.operand);
            } else {
                return false;
            }
        } else if ($expr instanceof MemberAccess) {
            return this.#isLvalue($expr.base);
        } else {
            return false;
        }
    }

    #canBeConst($expr: Expression): boolean {
        const $parent = $expr.parent;

        if ($parent instanceof ParenExpr) {
            return this.#canBeConst($parent);
        } else if ($parent instanceof Call) {
            const argIdx = $parent.args.findIndex(($arg) => $arg.astId === $expr.astId);
            if (argIdx === -1 || $parent.function.params.length <= argIdx) {
                return false;
            }
            const $leftTy = $parent.function.params[argIdx].type.desugarAll;
            if ($leftTy instanceof PointerType && $leftTy.pointee.constant) {
                return true;
            }
        } else if ($parent instanceof BinaryOp && $parent.isAssignment) {
            const $leftTy = $parent.left.type.desugarAll;
            if ($leftTy instanceof PointerType && $leftTy.pointee.constant) {
                return true;
            }
        } else if ($parent instanceof TernaryOp) {
            if ($parent.trueExpr.astId === $expr.astId || $parent.falseExpr.astId === $expr.astId) {
                return this.#canBeConst($parent);
            }
        } else if ($parent instanceof Vardecl) {
            const $leftTy = $parent.type.desugarAll;
            if ($leftTy instanceof PointerType && $leftTy.pointee.constant) {
                return true;
            }
        }
        return false;
    }
}

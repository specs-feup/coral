import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import ScopeNode from "@specs-feup/clava-flow/cfg/node/ScopeNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import ClavaJoinPoints from "@specs-feup/clava/api/clava/ClavaJoinPoints.js";
import {
    BinaryOp,
    Call,
    Cast,
    Expression,
    FunctionJp,
    Literal,
    MemberAccess,
    ParenExpr,
    ReturnStmt,
    Scope,
    UnaryExprOrType,
    UnaryOp,
    Vardecl,
    Varref,
} from "@specs-feup/clava/api/Joinpoints.js";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralTransformation, {
    CoralTransformationApplier,
} from "@specs-feup/coral/graph/CoralTransformation";
import Access from "@specs-feup/coral/mir/Access";
import FunctionCall from "@specs-feup/coral/mir/FunctionCall";
import Loan from "@specs-feup/coral/mir/Loan";
import Path from "@specs-feup/coral/mir/path/Path";
import PathDeref from "@specs-feup/coral/mir/path/PathDeref";
import PathMemberAccess from "@specs-feup/coral/mir/path/PathMemberAccess";
import PathVarRef from "@specs-feup/coral/mir/path/PathVarRef";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import RefTy from "@specs-feup/coral/mir/symbol/ty/RefTy";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import LifetimeAssignmentPragma from "@specs-feup/coral/pragma/lifetime/LifetimeAssignmentPragma";
import LfPath from "@specs-feup/coral/pragma/lifetime/path/LfPath";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";
import Node from "@specs-feup/flow/graph/Node";
import Query from "@specs-feup/lara/api/weaver/Query.js";

export default class ControlFlowAnnotator extends CoralTransformation {
    applier = ControlFlowAnnotatorApplier;
}

class ControlFlowAnnotatorApplier extends CoralTransformationApplier {
    apply(): void {
        for (const fn of this.graph.functionsToAnalyze) {
            const coralFn = fn
                .init(new CoralFunctionNode.Builder())
                .as(CoralFunctionNode);
            this.#annotateFunction(coralFn);
        }
    }

    #annotateFunction(fn: CoralFunctionNode.Class) {
        for (const node of fn.controlFlowNodes.filterIs(ClavaControlFlowNode)) {
            // TODO
            // if (!node.is(LivenessNode.TypeGuard)) {
            //     node.init(new LivenessNode.Builder());
            // }

            const coralNode = node.init(new CoralCfgNode.Builder()).as(CoralCfgNode);

            node.switch(
                Node.Case(ScopeNode, (node) =>
                    this.#annotateScope(coralNode, node.jp, node.isScopeStart),
                ),
                Node.Case(VariableDeclarationNode, (node) =>
                    this.#annotateVarDecl(coralNode, node.jp),
                ),
                Node.Case(ExpressionNode, (node) =>
                    this.#annotateExpr(coralNode, node.jp),
                ),
                Node.Case(ReturnNode, (node) =>
                    this.#annotateExpr(coralNode, node.jp.returnExpr),
                ),
                Node.Case(ConditionNode, (node) =>
                    this.#annotateExpr(coralNode, node.condition),
                ),
            );
        }
    }

    #annotateScope(node: CoralCfgNode.Class, $scope: Scope, isScopeStart: boolean) {
        const vars = Query.searchFrom(
            $scope,
            Vardecl,
            ($vardecl) => $vardecl.getAncestor("scope").astId === $scope.astId,
        ).get();

        if ($scope.parent instanceof FunctionJp) {
            vars.push(...$scope.parent.params);
        }

        if (isScopeStart) {
            node.varsEnteringScope = vars;
        } else {
            node.varsLeavingScope = vars;
            for (const $vardecl of vars) {
                const ty = this.graph.getSymbol($vardecl);
                node.addAccess(new PathVarRef($vardecl, ty), Access.Kind.STORAGE_DEAD);
            }
        }
    }

    #annotateVarDecl(node: CoralCfgNode.Class, $vardecl: Vardecl) {
        if ($vardecl.init instanceof Call) {
            // For function calls, the vardecl will be annotated when the call is annotated
            // so we will just skip the annotation here and go straight to the call
            this.#annotateExpr(node, $vardecl.init);
            return;
        }

        if ($vardecl.hasInit) {
            this.#annotateExpr(node, $vardecl.init);
            const ty = this.graph.getSymbol($vardecl);
            node.addAccess(new PathVarRef($vardecl, ty), Access.Kind.WRITE);
        }
    }

    #annotateExpr(node: CoralCfgNode.Class, $expr: Expression) {
        if ($expr instanceof Literal) {
            // Literals do not require annotation
            return;
        } else if ($expr instanceof BinaryOp) {
            this.#annotateBinaryOp(node, $expr);
        } else if ($expr instanceof UnaryOp) {
            this.#annotateUnaryOp(node, $expr);
        } else if ($expr instanceof Call) {
            this.#annotateFunctionCall(node, $expr);
        } else if ($expr instanceof Varref) {
            this.#annotateReadAccess(node, $expr);
        } else if ($expr instanceof ParenExpr) {
            this.#annotateExpr(node, $expr.subExpr);
        } else if ($expr instanceof MemberAccess) {
            this.#annotateReadAccess(node, $expr);
        } else if ($expr instanceof Cast) {
            if (
                $expr.type.isPointer ||
                $expr.type.isArray ||
                $expr.subExpr.type.isPointer ||
                $expr.subExpr.type.isArray
            ) {
                // TODO

                // TODO make it part of the error stack
                throw new Error(
                    "Casts to pointers or arrays are not supported\n" + $expr.code,
                );
            }
            this.#annotateExpr(node, $expr.subExpr);
        } else if ($expr instanceof UnaryExprOrType) {
            // This is the sizeof operator
            // Nothing is done (due to normalizations, inside is a varref without side effects)
            // sizeof(a) is not an access of a, because it does not matter what value it has, only
            // its type, which is statically known, is evaluated
            return;
        } else {
            // TODO Unhandled:
            // ArrayAccess
            // TODO initializer expressions (e.g. `{1, 2}`) are not handled

            // TODO make it part of the error stack
            throw new Error(
                "Unhandled expression annotation for jp: " +
                    $expr.joinPointType +
                    "\n" +
                    $expr.code,
            );
        }
    }

    #annotateBinaryOp(node: CoralCfgNode.Class, $binaryOp: BinaryOp) {
        if ($binaryOp.isAssignment) {
            this.#annotateExpr(node, $binaryOp.right);
            const path = this.#parseLvalue($binaryOp.left);
            node.addAccess(path, Access.Kind.WRITE);
        } else {
            this.#annotateExpr(node, $binaryOp.left);
            this.#annotateExpr(node, $binaryOp.right);
        }
    }

    #annotateUnaryOp(node: CoralCfgNode.Class, $unaryOp: UnaryOp) {
        if ($unaryOp.operator === "&") {
            const reborrow =
                Query.searchFrom(
                    $unaryOp,
                    UnaryOp,
                    ($inner) => $inner.operator === "*",
                ).get().length > 0; // TODO was !== undefined before; confirm it is ok
            this.#annotateReference(node, $unaryOp, reborrow);
        } else if ($unaryOp.operator === "*") {
            this.#annotateReadAccess(node, $unaryOp);
        } else {
            this.#annotateExpr(node, $unaryOp.operand);
        }
    }

    #annotateReference(node: CoralCfgNode.Class, $expr: Expression, reborrow: boolean) {
        let $parent = $expr.parent;
        while ($parent instanceof ParenExpr) {
            $parent = $parent.parent;
        }

        let loanedPath: Path | undefined;
        if ($expr instanceof UnaryOp && $expr.operator === "&") {
            loanedPath = this.#parseLvalue($expr.operand);
        } else {
            const $loanedPathJp = ClavaJoinPoints.unaryOp("*", $expr);
            loanedPath = new PathDeref($loanedPathJp, this.#parseLvalue($expr));
        }

        if (
            $parent instanceof BinaryOp &&
            ["lt", "gt", "le", "ge", "eq", "ne"].indexOf($parent.kind) !== -1
        ) {
            // We are comparing pointers, this is not a borrow
            // It still is an access though
            // TODO check if this access is correct
            node.addAccess(loanedPath, Access.Kind.BORROW);
            return;
        }

        let leftTy: Ty | undefined;
        if ($parent instanceof BinaryOp && $parent.isAssignment) {
            leftTy = this.#parseLvalue($parent.left).ty;
        } else if ($parent instanceof Vardecl) {
            leftTy = this.graph.getSymbol($parent);
        } else if ($parent instanceof ReturnStmt) {
            leftTy = this.#regionck!.getReturnTy();
        } else if ($parent instanceof Call) {
            const fnCall = node.fnCalls.find(
                (fnCall) => fnCall.$callJp.astId === $parent.astId,
            );
            if (fnCall === undefined) {
                throw new Error("Function call not found");
            }

            // Assumes no parenthesis after normalization
            const paramIndex = $parent.args.findIndex((arg) => arg.astId === $expr.astId);
            if (paramIndex === -1) {
                throw new Error("Parameter not found");
            }

            leftTy = fnCall.paramTys[paramIndex];
        } else {
            console.log($parent.code);
            // Assuming the weakest borrow is ok for `ref1;` but is not sound for `*(&a) = 5;`
            // Loan could be assumed to be the weakest borrow, but there is the risk that that is not sound.
            throw new Error("leftTy not found to annotate reference.");
        }

        if (!(leftTy instanceof RefTy)) {
            throw new Error(
                `Cannot borrow from non-reference type ${leftTy?.toString()}`,
            );
        }

        const regionVar = this.#regionck!.newRegionVar(RegionVariable.Kind.EXISTENTIAL);

        node.addLoan(loanedPath, regionVar, reborrow, leftTy);
        node.addAccess(loanedPath, Access.Kind.fromLoanKind(leftTy.loanKind));
    }

    #annotateFunctionCall(node: CoralCfgNode.Class, $call: Call) {
        const $fn = $call.function;

        const coralPragmas = CoralPragma.parse($fn.pragmas);
        const potentialAssignmentPragmas = coralPragmas.filter(
            (p) =>
                p.name === LifetimeAssignmentPragma.keyword &&
                p.tokens.some((token) => token === "="),
        );
        const lifetimeAssignmentPragmas = LifetimeAssignmentPragma.parse(
            potentialAssignmentPragmas,
        );
        let lifetimeAssignments = new Map<
            string,
            [LfPath, RegionVariable, LifetimeAssignmentPragma][]
        >();
        let lifetimes = new Map<string, RegionVariable>();
        lifetimes.set("%static", this.#regionck!.staticRegionVar);
        for (const lifetimeAssignmentPragma of lifetimeAssignmentPragmas) {
            const lfPath = lifetimeAssignmentPragma.lhs;
            let regionVar = lifetimes.get(lifetimeAssignmentPragma.rhs);
            if (regionVar === undefined) {
                regionVar = this.#regionck!.newRegionVar(RegionVariable.Kind.EXISTENTIAL);
                lifetimes.set(lifetimeAssignmentPragma.rhs, regionVar);
            }

            if (lifetimeAssignments.has(lfPath.varName)) {
                lifetimeAssignments
                    .get(lfPath.varName)!
                    .push([lfPath, regionVar, lifetimeAssignmentPragma]);
            } else {
                lifetimeAssignments.set(lfPath.varName, [
                    [lfPath, regionVar, lifetimeAssignmentPragma],
                ]);
            }
        }

        const takenLifetimeNames = new Set(lifetimes.keys());

        // Return type
        const returnTy = this.#parseType(
            $fn.returnType,
            lifetimeAssignments.get("return"),
            RegionVariable.Kind.EXISTENTIAL,
            takenLifetimeNames,
            "return",
        );

        if ($fn.returnType.desugarAll.code !== "void") {
            // Normalization implies parent is Vardecl
            let $vardecl = $call.parent;
            while (!($vardecl instanceof Vardecl)) {
                $vardecl = $vardecl.parent;
            }

            this.#regionck!.registerTy($vardecl, returnTy);
            node.addAccess(new PathVarRef($vardecl, returnTy), Access.Kind.WRITE);
        }

        // Params
        const paramTys: Ty[] = [];
        for (const $param of $fn.params) {
            const ty = this.#parseType(
                $param.type,
                lifetimeAssignments.get($param.name),
                RegionVariable.Kind.EXISTENTIAL,
                takenLifetimeNames,
                $param.name,
            );
            paramTys.push(ty);
        }

        node.fnCalls.push(new FunctionCall($call, lifetimes, returnTy, paramTys));

        for (const $expr of $call.args) {
            this.#annotateExpr(node, $expr);
        }

        return returnTy;
    }

    #annotateReadAccess(
        node: CoralCfgNode.Class,
        $expr: Varref | UnaryOp | MemberAccess,
    ) {
        const path = this.#parseLvalue($expr);

        if (path.ty instanceof RefTy) {
            this.#annotateReference(node, $expr, true);
        } else {
            node.addAccess(path, Access.Kind.READ);
        }
    }

    #parseLvalue($expr: Expression): Path {
        if ($expr instanceof Varref) {
            const ty = this.graph.getSymbol($expr.vardecl);
            return new PathVarRef($expr, ty);
        } else if ($expr instanceof ParenExpr) {
            return this.#parseLvalue($expr.subExpr);
        } else if ($expr instanceof UnaryOp && $expr.operator === "*") {
            const innerPath = this.#parseLvalue($expr.operand);
            return new PathDeref($expr, innerPath);
        } else if ($expr instanceof MemberAccess) {
            let innerPath = this.#parseLvalue($expr.base);
            if ($expr.arrow) {
                const $innerJp = ClavaJoinPoints.unaryOp("*", $expr.base);
                innerPath = new PathDeref($innerJp, innerPath);
            }
            return new PathMemberAccess($expr, innerPath, $expr.name);
        } else {
            throw new Error("Unhandled parseLvalue: " + $expr.code);
        }
    }
}

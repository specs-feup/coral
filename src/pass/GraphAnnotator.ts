import ConditionNode from "clava-flow/flow/node/condition/ConditionNode";
import ExpressionNode from "clava-flow/flow/node/instruction/ExpressionNode";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import ReturnNode from "clava-flow/flow/node/instruction/ReturnNode";
import ScopeEndNode from "clava-flow/flow/node/instruction/ScopeEndNode";
import ScopeStartNode from "clava-flow/flow/node/instruction/ScopeStartNode";
import SwitchNode from "clava-flow/flow/node/instruction/SwitchNode";
import VarDeclarationNode from "clava-flow/flow/node/instruction/VarDeclarationNode";
import LivenessNode from "clava-flow/flow/transformation/liveness/LivenessNode";
import BaseGraph from "clava-flow/graph/BaseGraph";
import { GraphTransformation } from "clava-flow/graph/Graph";
import {
    BinaryOp,
    Body,
    BuiltinType,
    Call,
    ElaboratedType,
    EnumDecl,
    ExprStmt,
    Expression,
    FunctionJp,
    If,
    Literal,
    Loop,
    MemberAccess,
    Param,
    ParenExpr,
    ParenType,
    PointerType,
    QualType,
    RecordJp,
    Scope,
    TagType,
    Type,
    TypedefType,
    UnaryOp,
    Vardecl,
    Varref,
} from "clava-js/api/Joinpoints.js";
import CoralGraph from "coral/graph/CoralGraph";
import CoralNode from "coral/graph/CoralNode";
import FnLifetimes from "coral/lifetimes/FnLifetimes";
import Access from "coral/mir/Access";
import Loan from "coral/mir/Loan";
import Path from "coral/mir/path/Path";
import PathDeref from "coral/mir/path/PathDeref";
import PathMemberAccess from "coral/mir/path/PathMemberAccess";
import PathVarRef from "coral/mir/path/PathVarRef";
import BorrowKind from "coral/mir/ty/BorrowKind";
import BuiltinTy from "coral/mir/ty/BuiltinTy";
import RefTy from "coral/mir/ty/RefTy";
import StructTy from "coral/mir/ty/StructTy";
import Ty from "coral/mir/ty/Ty";
import MetaRefTy from "coral/mir/ty/meta/MetaRefTy";
import MetaStructTy from "coral/mir/ty/meta/MetaStructTy";
import MetaTy from "coral/mir/ty/meta/MetaTy";
import StructDef from "coral/mir/ty/meta/StructDef";
import CoralPragma from "coral/pragma/CoralPragma";
import LifetimeBoundPragma from "coral/pragma/LifetimeBoundPragma";
import LifetimeAssignmentPragma from "coral/pragma/lifetime/LifetimeAssignmentPragma";
import LfPath from "coral/pragma/lifetime/path/LfPath";
import LfPathDeref from "coral/pragma/lifetime/path/LfPathDeref";
import LfPathMemberAccess from "coral/pragma/lifetime/path/LfPathMemberAccess";
import LfPathVarRef from "coral/pragma/lifetime/path/LfPathVarRef";
import MetaRegionVariable from "coral/regionck/MetaRegionVariable";
import MetaRegionVariableBound from "coral/regionck/MetaRegionVariableBound";
import RegionVariable from "coral/regionck/RegionVariable";
import Regionck from "coral/regionck/Regionck";
import Query from "lara-js/api/weaver/Query.js";

export default class GraphAnnotator implements GraphTransformation {
    #regionck?: Regionck;

    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("GraphAnnotator can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            this.#regionck = coralGraph.getRegionck(functionEntry);
            this.#annotateFunction(functionEntry);
        }
    }

    #annotateFunction(functionEntry: FunctionEntryNode.Class) {
        this.#regionck!.newRegionVar(RegionVariable.Kind.UNIVERSAL, "static");

        const coralPragmas = CoralPragma.parse(functionEntry.jp.pragmas);
        const lifetimeBoundPragmas = LifetimeBoundPragma.parse(coralPragmas);
        const lifetimeAssignmentPragmas = LifetimeAssignmentPragma.parse(coralPragmas);
        // TODO

        for (const node of functionEntry.reachableNodes) {
            if (!node.is(LivenessNode.TypeGuard)) {
                continue;
            }

            const coralNode = node.init(new CoralNode.Builder()).as(CoralNode.Class);

            if (node.is(ScopeStartNode.TypeGuard)) {
                const scopeStartNode = node.as(ScopeStartNode.Class);
                this.#annotateScope(coralNode, scopeStartNode.jp, "start");
            } else if (node.is(ScopeEndNode.TypeGuard)) {
                const scopeEndNode = node.as(ScopeEndNode.Class);
                this.#annotateScope(coralNode, scopeEndNode.jp, "end");
            } else if (node.is(VarDeclarationNode.TypeGuard)) {
                const varDeclarationNode = node.as(VarDeclarationNode.Class);
                this.#annotateVarDecl(coralNode, varDeclarationNode.jp);
            } else if (node.is(ExpressionNode.TypeGuard)) {
                const expressionNode = node.as(ExpressionNode.Class);
                this.#annotateExpr(coralNode, expressionNode.jp);
            } else if (node.is(SwitchNode.TypeGuard)) {
                const switchNode = node.as(SwitchNode.Class);
                this.#annotateExpr(coralNode, switchNode.jp.condition);
            } else if (node.is(ReturnNode.TypeGuard)) {
                const returnNode = node.as(ReturnNode.Class);
                this.#annotateExpr(coralNode, returnNode.jp.returnExpr);
            } else if (node.is(ConditionNode.TypeGuard)) {
                const conditionNode = node.as(ConditionNode.Class);
                const $jp = conditionNode.jp;
                if ($jp instanceof If) {
                    this.#annotateExpr(coralNode, $jp.cond);
                } else if ($jp instanceof Loop) {
                    this.#annotateExpr(coralNode, ($jp.cond as ExprStmt).expr);
                }
            }
        }
    }

    #annotateScope(node: CoralNode.Class, $scope: Scope, type: "start" | "end") {
        const vars = [];
        for (const $jp of Query.searchFrom($scope, "vardecl")) {
            const $vardecl = $jp as Vardecl;
            let $vardeclScope = $vardecl.parent;
            while (!($vardeclScope instanceof Scope)) {
                $vardeclScope = $vardeclScope.parent;
            }

            if ($vardeclScope.astId !== $scope.astId) {
                continue;
            }
            vars.push($vardecl);
        }

        if ($scope.parent instanceof FunctionJp) {
            const $fn = $scope.parent as FunctionJp;
            $fn.params.forEach((param) => {
                vars.push(param);
            });
        }

        if (type === "start") {
            node.varsEnteringScope = vars;
        } else {
            for (const $vardecl of vars) {
                const ty = this.#regionck!.getTy($vardecl);
                if (ty === undefined) {
                    throw new Error("Variable " + $vardecl.name + " not found");
                }
                node.accesses.push(
                    new Access(
                        new PathVarRef($vardecl, ty),
                        Access.Mutability.STORAGE_DEAD,
                        Access.Depth.SHALLOW,
                    ),
                );
            }
            node.varsLeavingScope = vars;
        }
    }

    #annotateVarDecl(node: CoralNode.Class, $vardecl: Vardecl) {
        const ty = this.#parseType($vardecl.type);
        this.#regionck!.registerTy($vardecl, ty);

        // if ($vardecl instanceof Param) {
        //     // Annotate param universal regions
        //     regiock.fnLifetimes = new FnLifetimes(functionEntry.jp);

        //     const ty = this.#parseType($vardecl.type);

        //     // TODO: Retrieve lifetimes from fnLifetimes
        //     // & Create multiple regionVars if needed

        //     const regionVar = regionck.newRegionVar(RegionVariable.Kind.EXISTENTIAL);
        // }

        if ($vardecl.hasInit) {
            this.#annotateExpr(node, $vardecl.init);

            node.accesses.push(
                new Access(
                    new PathVarRef($vardecl, ty),
                    Access.Mutability.WRITE,
                    Access.Depth.SHALLOW,
                ),
            );
        }
    }

    #annotateExpr(node: CoralNode.Class, $expr: Expression | undefined) {
        if ($expr === undefined || $expr instanceof Literal) {
            return;
        }

        if ($expr instanceof BinaryOp) {
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
        } else {
            // TODO Unhandled:
            // Member Access -> this.#annotateReadAccess
            // UnaryExprOrType
            // ArrayAccess
            // Cast

            // TODO initializer expressions (e.g. `{1, 2}`) are not handled
            throw new Error(
                "Unhandled expression annotation for jp: " + $expr.joinPointType,
            );
        }
    }

    #annotateBinaryOp(node: CoralNode.Class, $binaryOp: BinaryOp) {
        if ($binaryOp.isAssignment) {
            this.#annotateExpr(node, $binaryOp.right);
            const path = this.#parseLvalue($binaryOp.left);
            node.accesses.push(
                new Access(path, Access.Mutability.WRITE, Access.Depth.SHALLOW),
            );
        } else {
            this.#annotateExpr(node, $binaryOp.left);
            this.#annotateExpr(node, $binaryOp.right);
        }
    }

    #annotateUnaryOp(node: CoralNode.Class, $unaryOp: UnaryOp) {
        if ($unaryOp.operator === "&") {
            const reborrow =
                Query.searchFrom($unaryOp, "unaryOp", { operator: "*" }).get() !==
                undefined;
            this.#annotateReference(node, $unaryOp, reborrow);
        } else if ($unaryOp.operator === "*") {
            this.#annotateReadAccess(node, $unaryOp);
        } else {
            this.#annotateExpr(node, $unaryOp.operand);
        }
    }

    #annotateReference(
        node: CoralNode.Class,
        $expr: Expression,
        reborrow: boolean,
        ty?: Ty,
    ) {
        let $parent = $expr.parent;
        while ($parent instanceof ParenExpr) {
            $parent = $parent.parent;
        }

        let leftTy: Ty | undefined;
        if ($parent instanceof BinaryOp && $parent.isAssignment) {
            leftTy = this.#parseLvalue($parent.left).ty;
        } else if ($parent instanceof Vardecl) {
            leftTy = this.#regionck!.getTy($parent);
        } else {
            // Assuming the weakest borrow is ok for `ref1;` but is not sound for `*(&a) = 5;`
            // Loan could be assumed to be the weakest borrow, but there is the risk that that is not sound.
            throw new Error("leftTy not found to annotate reference.");
        }

        if (!(leftTy instanceof RefTy)) {
            throw new Error(
                `Cannot borrow from non-reference type ${leftTy?.toString()}`,
            );
        }

        if ($expr instanceof UnaryOp && $expr.operator === "&") {
            $expr = $expr.operand;
        }

        const loanedPath = this.#parseLvalue($expr);
        const regionVar = this.#regionck!.newRegionVar(RegionVariable.Kind.EXISTENTIAL);

        node.loan = new Loan(node, regionVar, reborrow, leftTy, loanedPath, ty);

        node.accesses.push(
            new Access(
                loanedPath,
                Access.Mutability.fromBorrowKind(leftTy.borrowKind),
                Access.Depth.DEEP,
            ),
        );
    }

    #annotateFunctionCall(node: CoralNode.Class, $call: Call) {
        // TODO
        throw new Error("Unimplemented annotateFunctionCall");
        // for (const $expr of $call.args) {
        //     const path = this.#parseLvalue($expr);
        //     // TODO: Set correct AccessMutability and AccessDepth (require knowing the function declaration)
        //     node.scratch("_coral").accesses.push(
        //         new Access(path, Access.Mutability.READ, Access.Depth.DEEP),
        //     );
        //     // TODO: Identify & mark moves
        // }
    }

    #annotateReadAccess(node: CoralNode.Class, $expr: Varref | UnaryOp | MemberAccess) {
        const path = this.#parseLvalue($expr);

        if (path.ty instanceof RefTy) {
            this.#annotateReference(node, $expr, true, path.ty.referent);
        } else {
            node.accesses.push(
                new Access(path, Access.Mutability.READ, Access.Depth.DEEP),
            );
        }
    }

    #parseType(
        $type: Type,
        regionVar?: RegionVariable,
        isConst = false,
        isRestrict = false,
    ): Ty {
        if ($type instanceof QualType) {
            if ($type.qualifiers.includes("const")) {
                isConst = true;
            }
            if ($type.qualifiers.includes("restrict")) {
                isRestrict = true;
            }
            $type = $type.unqualifiedType;
        }

        if ($type instanceof BuiltinType) {
            return new BuiltinTy($type.builtinKind, $type, isConst);
        } else if ($type instanceof PointerType) {
            const inner = this.#parseType($type.pointee, regionVar);
            if (inner.isConst && isRestrict) {
                throw new Error("Cannot have a restrict pointer to a const type");
            }
            return new RefTy(
                inner.isConst ? BorrowKind.SHARED : BorrowKind.MUTABLE,
                inner,
                $type,
                regionVar
                    ? regionVar
                    : this.#regionck!.newRegionVar(RegionVariable.Kind.EXISTENTIAL),
                isConst,
            );
        } else if ($type instanceof TypedefType) {
            return this.#parseType($type.underlyingType, regionVar, isConst, isRestrict);
        } else if ($type instanceof ElaboratedType) {
            return this.#parseType($type.namedType, regionVar, isConst, isRestrict);
        } else if ($type instanceof ParenType) {
            return this.#parseType($type.innerType, regionVar, isConst, isRestrict);
        } else if ($type instanceof TagType) {
            const $decl = $type.decl;
            if ($decl instanceof RecordJp) {
                const structDef = this.#regionck!.structDefs.get($decl);

                const regionVars = new Map<string, RegionVariable>();
                for (const metaRegionVar of structDef.metaRegionVars) {
                    regionVars.set(metaRegionVar.name, this.#regionck!.newRegionVar(RegionVariable.Kind.EXISTENTIAL));
                }

                return new StructTy(structDef, regionVars, isConst);
            } else if ($decl instanceof EnumDecl) {
                return new BuiltinTy(`enum ${$decl.name}`, $decl, isConst);
            } else {
                // TypedefNameDecl;
                //     TypedefDecl;
                throw new Error("Unhandled parseType TagType: " + $decl.joinPointType);
            }
        } else {
            // UndefinedType;
            // AdjustedType;
            // ArrayType;
            //     VariableArrayType;
            // FunctionType;
            throw new Error("Unhandled parseType: " + $type.joinPointType);
        }
    }

    #parseLvalue($expr: Expression): Path {
        if ($expr instanceof Varref) {
            const ty = this.#regionck!.getTy($expr.vardecl);
            // TODO will there not be problems if the order of the nodes is different?
            if (ty === undefined) {
                throw new Error("Variable " + $expr.name + " not found");
            }

            return new PathVarRef($expr, ty);
        } else if ($expr instanceof ParenExpr) {
            return this.#parseLvalue($expr.subExpr);
        } else if ($expr instanceof UnaryOp) {
            if ($expr.operator === "*") {
                const innerPath = this.#parseLvalue($expr.operand);
                return new PathDeref($expr, innerPath);
            } else {
                throw new Error("Unhandled parseLvalue unary op: " + $expr.operator);
            }
        } else if ($expr instanceof MemberAccess) {
            let inner = this.#parseLvalue($expr.base);
            if ($expr.arrow) {
                inner = new PathDeref($expr, inner);
            }

            return new PathMemberAccess($expr, inner, $expr.name);
        } else {
            throw new Error("Unhandled parseLvalue: " + $expr.joinPointType);
        }
    }
}

import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import {
    BinaryOp,
    Call,
    Cast,
    Expression,
    Literal,
    ParenExpr,
    UnaryOp,
    Vardecl,
    Varref,
} from "@specs-feup/clava/api/Joinpoints.js";
import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import ControlFlowNode from "@specs-feup/flow/flow/ControlFlowNode";
import Node from "@specs-feup/flow/graph/Node";
import PathVarRef from "@specs-feup/coral/mir/path/PathVarRef";
import Access from "@specs-feup/coral/mir/action/Access";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
export default class NullabilityAnnotator extends CoralFunctionWiseTransformation {
    fnApplier = NullabilityAnnotatorApplier;
}

class NullabilityAnnotatorApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        const fnAsAny = this.fn as any;
        if (!fnAsAny.debugNullabilityStates) {
            fnAsAny.debugNullabilityStates = new Map<string, string>();
        }

        // We only iterate and "observe". No node.init() or addAccess() needed 
        // because ControlFlowAnnotator already did that.
        for (const node of this.fn.controlFlowNodes.filterIs(ControlFlowNode)) {
            if (!node.is(ClavaControlFlowNode)) continue;
            const coralNode = node.init(new CoralCfgNode.Builder()).as(CoralCfgNode);

            node.switch(
                Node.Case(VariableDeclarationNode, (n) => this.#trackVarDecl(coralNode,n.jp)),
                Node.Case(ExpressionNode, (n) => this.#trackExpression(n.jp)),
                Node.Case(ConditionNode, (n) => this.#trackGuard(n)),
            );
        }
    }

    #trackVarDecl(node: CoralCfgNode.Class,$vardecl: Vardecl) {


        const name = $vardecl.name;
        const fnAsAny = this.fn as any;
    
        if ($vardecl.init instanceof Call) {
            fnAsAny.debugNullabilityStates.set(name, "MAYBE_NULL");
            return;
        }
    
        if ($vardecl.hasInit) {
            const initialState = this.#getExpressionState($vardecl.init);
            fnAsAny.debugNullabilityStates.set(name, initialState);
            console.log(`[Flow] Declaração: ${name} = ${$vardecl.init.code} (Estado: ${initialState})`);
    
            const ty = this.fn.getSymbol($vardecl);
            node.addAccess(new PathVarRef($vardecl, ty), Access.Kind.WRITE);
        } else {
            fnAsAny.debugNullabilityStates.set(name, "MAYBE_NULL");
            console.log(`[Flow] Declaração: ${name} sem init (Assumido: MAYBE_NULL)`);
        }
    }

    #trackExpression($expr: Expression) {
        // We only care about assignments here to update our map
        if ($expr instanceof BinaryOp && $expr.isAssignment) {
            if ($expr.left instanceof Varref) {
                const name = $expr.left.name;
                const state = this.#getExpressionState($expr.right);
                (this.fn as any).debugNullabilityStates.set(name, state);
            }
        }
    }

    #trackGuard(node: ConditionNode.Class) {
        const $jp = node.jp;
        const $if = $jp.getAncestor("if") as any;

        // If 'if' returns, the rest of the function can assume the inverse condition
        if ($if?.then?.code.includes("return")) {
            const conditionCode = $jp.code;
            if (conditionCode.includes("== NULL") || conditionCode.includes("== 0")) {
                const parts = conditionCode.split("==").map((s: string) => s.trim());
                const varName = parts.find(p => p !== "NULL" && p !== "0");

                if (varName) {
                    (this.fn as any).debugNullabilityStates.set(varName, "NOT_NULL");
                    console.log(`[Flow-Refine] Guard detected! '${varName}' is now NOT_NULL`);
                }
            }
        }
    }

    #getExpressionState($expr: Expression): any {
        const fnAsAny = this.fn as any;

        if (!fnAsAny.debugNullabilityStates) {
            fnAsAny.debugNullabilityStates = new Map<string, any>();
        }
    
        if ($expr instanceof Varref) {
            return fnAsAny.debugNullabilityStates.get($expr.name) ?? "MAYBE_NULL";
        } 
        
        if ($expr instanceof UnaryOp && $expr.operator === "&") {
            return "NOT_NULL";
        }
    
        if ($expr instanceof Literal) {
            if ($expr.code === "0" || $expr.code === "NULL") return "NULL";
            return "NOT_NULL"; 
        }
    
        if ($expr instanceof Cast) {
            return this.#getExpressionState($expr.subExpr);
        }
    
        if ($expr instanceof ParenExpr) {
            return this.#getExpressionState($expr.subExpr);
        }
        return "MAYBE_NULL";
    }

    
}
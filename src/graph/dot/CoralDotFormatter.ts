import DotFormatter from "clava-flow/dot/DotFormatter";
import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import ConditionNode from "clava-flow/flow/node/condition/ConditionNode";
import CommentNode from "clava-flow/flow/node/instruction/CommentNode";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import FunctionExitNode from "clava-flow/flow/node/instruction/FunctionExitNode";
import InstructionNode from "clava-flow/flow/node/instruction/InstructionNode";
import ScopeEndNode from "clava-flow/flow/node/instruction/ScopeEndNode";
import ScopeStartNode from "clava-flow/flow/node/instruction/ScopeStartNode";
import EmptyStatementNode from "clava-flow/flow/node/instruction/EmptyStatementNode";
import UnknownInstructionNode from "clava-flow/flow/node/instruction/UnknownInstructionNode";
import BaseEdge from "clava-flow/graph/BaseEdge";
import BaseNode from "clava-flow/graph/BaseNode";
import ExpressionNode from "clava-flow/flow/node/instruction/ExpressionNode";
import VarDeclarationNode from "clava-flow/flow/node/instruction/VarDeclarationNode";
import PragmaNode from "clava-flow/flow/node/instruction/PragmaNode";
import SwitchNode from "clava-flow/flow/node/instruction/SwitchNode";
import ReturnNode from "clava-flow/flow/node/instruction/ReturnNode";
import BreakNode from "clava-flow/flow/node/instruction/BreakNode";
import ContinueNode from "clava-flow/flow/node/instruction/ContinueNode";
import GotoLabelNode from "clava-flow/flow/node/instruction/GotoLabelNode";
import GotoNode from "clava-flow/flow/node/instruction/GotoNode";

export default class CoralDotFormatter extends DotFormatter {
    override formatNode(node: BaseNode.Class): DotFormatter.Node {
        let label;
        let shape = "box";
        if (node.is(ConditionNode.TypeGuard)) {
            const conditionNode = node.as(ConditionNode.Class);
            shape = "diamond";
            if (conditionNode.jp !== undefined) {
                label = `Condition:\n${conditionNode.jp.code}`;
            } else {
                label = `Condition (no jp)`;
            }
        } else if (node.is(CommentNode.TypeGuard)) {
            const commentNode = node.as(CommentNode.Class);
            label = `Comment:\n${commentNode.jp.code}`;
        } else if (node.is(FunctionEntryNode.TypeGuard)) {
            const functionEntryNode = node.as(FunctionEntryNode.Class);
            label = `Function Entry\n(${functionEntryNode.jp.name})`;
        } else if (node.is(FunctionExitNode.TypeGuard)) {
            const functionExitNode = node.as(FunctionExitNode.Class);
            label = `Function Exit\n(${functionExitNode.jp.name})`;
        } else if (node.is(ScopeStartNode.TypeGuard)) {
            label = `Scope Start`;
        } else if (node.is(ScopeEndNode.TypeGuard)) {
            label = `Scope End`;
        } else if (node.is(EmptyStatementNode.TypeGuard)) {
            label = `Empty Statement`;
        } else if (node.is(ExpressionNode.TypeGuard)) {
            const exprNode = node.as(ExpressionNode.Class);
            label = `Expression:\n${exprNode.jp.code}`;
        } else if (node.is(VarDeclarationNode.TypeGuard)) {
            const varDeclNode = node.as(VarDeclarationNode.Class);
            label = `Var Declaration:\n${varDeclNode.jp.code}`;
        } else if (node.is(SwitchNode.TypeGuard)) {
            label = "Switch";
        } else if (node.is(PragmaNode.TypeGuard)) {
            const pragmaNode = node.as(PragmaNode.Class);
            label = `Pragma:\n${pragmaNode.jp.code}`;
        } else if (node.is(ReturnNode.TypeGuard)) {
            const returnNode = node.as(ReturnNode.Class);
            if (returnNode.jp.returnExpr === undefined) {
                label = `Return`;
            } else {
                label = `Return:\n${returnNode.jp.returnExpr.code}`;
            }
        } else if (node.is(BreakNode.TypeGuard)) {
            label = `Break`;
        } else if (node.is(ContinueNode.TypeGuard)) {
            label = `Continue`;
        } else if (node.is(GotoLabelNode.TypeGuard)) {
            const gotoLabelNode = node.as(GotoLabelNode.Class);
            label = `Goto Label:\n${gotoLabelNode.jp.decl.name}`;
        } else if (node.is(GotoNode.TypeGuard)) {
            const gotoNode = node.as(GotoNode.Class);
            label = `Goto:\n${gotoNode.jp.label.name}`;
        } else if (node.is(UnknownInstructionNode.TypeGuard)) {
            const unknownInstructionNode = node.as(UnknownInstructionNode.Class);
            if (unknownInstructionNode.jp !== undefined) {
                label = `Unknown Instruction:\n${unknownInstructionNode.jp.code}`;
            } else {
                label = `Unknown Instruction`;
            }
        } else {
            label = "Not flow node";
        }

        return {
            id: node.id,
            attrs: {
                label,
                shape,
            },
        };
    }

    override formatEdge(edge: BaseEdge.Class): DotFormatter.Edge {
        let color = "black";
        if (edge.is(ControlFlowEdge.TypeGuard)) {
            if (edge.source.is(ConditionNode.TypeGuard)) {
                if (edge.id === edge.source.as(ConditionNode.Class).trueEdge.id) {
                    color = "green";
                } else if (edge.id === edge.source.as(ConditionNode.Class).falseEdge.id) {
                    color = "red";
                } else {
                    color = "blue";
                }
            } else if (edge.source.is(InstructionNode.TypeGuard)) {
                if (edge.id === edge.source.as(InstructionNode.Class).nextEdge?.id) {
                    color = "green";
                } else {
                    color = "blue";
                }
            } else {
                color = "blue";
            }
        }

        return {
            source: edge.source.id,
            target: edge.target.id,
            attrs: {
                color,
            },
        };
    }
}

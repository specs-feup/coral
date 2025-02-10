import ConditionalEdge from "@specs-feup/clava-flow/cfg/edge/ConditionalEdge";
import BreakNode from "@specs-feup/clava-flow/cfg/node/BreakNode";
import CommentNode from "@specs-feup/clava-flow/cfg/node/CommentNode";
import ContinueNode from "@specs-feup/clava-flow/cfg/node/ContinueNode";
import DoWhileNode from "@specs-feup/clava-flow/cfg/node/condition/DoWhileNode";
import EmptyStatementNode from "@specs-feup/clava-flow/cfg/node/EmptyStatementNode";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ForEachNode from "@specs-feup/clava-flow/cfg/node/condition/ForEachNode";
import ForNode from "@specs-feup/clava-flow/cfg/node/condition/ForNode";
import GotoLabelNode from "@specs-feup/clava-flow/cfg/node/GotoLabelNode";
import GotoNode from "@specs-feup/clava-flow/cfg/node/GotoNode";
import IfNode from "@specs-feup/clava-flow/cfg/node/condition/IfNode";
import PragmaNode from "@specs-feup/clava-flow/cfg/node/PragmaNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import ScopeNode from "@specs-feup/clava-flow/cfg/node/ScopeNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import WhileNode from "@specs-feup/clava-flow/cfg/node/condition/WhileNode";
import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import ClavaFunctionNode from "@specs-feup/clava-flow/ClavaFunctionNode";
import ClavaNode from "@specs-feup/clava-flow/ClavaNode";
import { ExprStmt, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import FlowDotFormatter from "@specs-feup/flow/flow/dot/FlowDotFormatter";
import BaseEdge from "@specs-feup/flow/graph/BaseEdge";
import BaseNode from "@specs-feup/flow/graph/BaseNode";
import Edge from "@specs-feup/flow/graph/Edge";
import Node from "@specs-feup/flow/graph/Node";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import MoveTable from "@specs-feup/coral/symbol/MoveTable";
import DropNode from "@specs-feup/coral/graph/DropNode";

export default class CoralDotFormatter<
    G extends CoralGraph.Class = CoralGraph.Class,
> extends FlowDotFormatter<G> {
    static jumpScopeTransparency = "8f";
    static codeFontSize = "10";
    static codeSmFontSize = "8";
    static locationFontSize = "9";
    static locationFontColor = "#c0c0c0";
    static keywordColor = "#4040e0";
    static symbolColor = "#8080a0";
    static trueColor = "#7bc706";
    static falseColor = "#d10202";

    static renderLineNumber(
        jp: Joinpoint,
        last: boolean = false,
        includeFilename: boolean = false,
    ): string {
        const line = (last ? jp.originNode.endLine : jp.originNode.line) ?? "?";
        const column = (last ? jp.originNode.endColumn : jp.originNode.column) ?? "?";
        const label = includeFilename
            ? `${jp.filename ?? "?"}:${line}:${column}`
            : `${line}:${column}`;
        return `<FONT FACE="Consolas" COLOR="${CoralDotFormatter.locationFontColor}" POINT-SIZE="${CoralDotFormatter.locationFontSize}">${label}</FONT>`;
    }

    static renderKeyword(kw: string): string {
        return `<FONT FACE="Consolas" COLOR="${CoralDotFormatter.keywordColor}" POINT-SIZE="${CoralDotFormatter.codeFontSize}">${kw}</FONT>`;
    }

    static renderSmKeyword(kw: string): string {
        return `<FONT FACE="Consolas" COLOR="${CoralDotFormatter.keywordColor}" POINT-SIZE="${CoralDotFormatter.codeSmFontSize}">${kw}</FONT>`;
    }

    static renderSymbol(sym: string, transparency: string = ""): string {
        return `<FONT FACE="Consolas" COLOR="${CoralDotFormatter.symbolColor + transparency}" POINT-SIZE="${CoralDotFormatter.codeFontSize}">${sym}</FONT>`;
    }

    static renderSmSymbol(sym: string, transparency: string = ""): string {
        if (sym === "") {
            return "";
        }
        return `<FONT FACE="Consolas" COLOR="${CoralDotFormatter.symbolColor + transparency}" POINT-SIZE="${CoralDotFormatter.codeSmFontSize}">${sym}</FONT>`;
    }

    static renderUnknownNode(jp: Joinpoint): string {
        return `<FONT FACE="Arial" COLOR="${CoralDotFormatter.symbolColor}" POINT-SIZE="6"><SUP>[Unknown joinpoint]</SUP>&nbsp;</FONT>${CoralDotFormatter.renderValue(jp.code)}`;
    }

    static renderValue(value: string): string {
        return `<FONT FACE="Consolas" POINT-SIZE="${CoralDotFormatter.codeFontSize}"><I>${value}</I></FONT>`;
    }

    static renderComment(comment: string): string {
        return `<FONT FACE="Consolas" COLOR="${CoralDotFormatter.locationFontColor}" POINT-SIZE="${CoralDotFormatter.locationFontSize}"><I>${comment}</I></FONT>`;
    }

    static renderNodeLabel(
        lineRef: Joinpoint | { jp: Joinpoint; last?: boolean; includeFilename?: boolean },
        ...labels: string[]
    ) {
        const jp = lineRef instanceof Joinpoint ? lineRef : lineRef.jp;
        const last = lineRef instanceof Joinpoint ? false : (lineRef.last ?? false);
        const includeFilename =
            lineRef instanceof Joinpoint ? false : (lineRef.includeFilename ?? false);
        return `${CoralDotFormatter.renderLineNumber(jp, last, includeFilename)}<BR/>${labels.join("")}`;
    }

    static #parseCellOptions(options: Record<string, string>): string {
        return Object
            .entries(options)
            .filter(([e, v]) => e !== "label" && v !== "")
            .map(([e, v]) => `${e.toUpperCase()}="${v}"`)
            .join(" ");
    }

    static renderMultirows(...rows: (string | Record<string, string>)[]): string {
        const renderedRows = rows
            .map(r => typeof r === "string" ? { label: r } : r)
            .filter(r => r.label.length > 0)
            .map((r) => `<TR><TD ${CoralDotFormatter.#parseCellOptions(r)}>${r.label}</TD></TR>`)
            .join("<HR/>");
        return `<TABLE BORDER="0">${renderedRows}</TABLE>`;
    }

    /**
     * @param node The node to get the attributes for.
     * @returns The attributes of the node.
     */
    static defaultGetNodeAttrs(node: BaseNode.Class): Record<string, string> {
        if (!node.is(ClavaNode)) {
            return {};
        }
        const result: Record<string, string> = {};

        node.switch(
            Node.Case(ClavaFunctionNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    { jp: n.jp, includeFilename: true },
                    n.functionName,
                );
            }),
            Node.Case(CommentNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderSymbol(n.jp.code),
                );
            }),
            Node.Case(PragmaNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderSymbol(n.jp.code),
                );
            }),
            Node.Case(ScopeNode, (n) => {
                let symbol = CoralDotFormatter.renderSymbol(
                    n.isScopeStart ? "{" : "}",
                    n.isFlowJump ? CoralDotFormatter.jumpScopeTransparency : "",
                );
                
                if (n.is(CoralCfgNode)) {
                    const coralNode = n.as(CoralCfgNode);
                    const varsEnteringScope = CoralDotFormatter.renderSmSymbol(
                        coralNode.varsEnteringScope.map((v) => v.name).join(", "),
                    );
                    const varsLeavingScope = CoralDotFormatter.renderSmSymbol(
                        coralNode.varsLeavingScope.map((v) => v.name).join(", "),
                    );
                    symbol = `${varsLeavingScope}${symbol}${varsEnteringScope}`;
                }

                result.label = CoralDotFormatter.renderNodeLabel(
                    { jp: n.jp, last: n.isScopeEnd },
                    symbol,
                );
                
                if (n.isFlowJump) {
                    result.color =
                        FlowDotFormatter.cfgNodeColor +
                        CoralDotFormatter.jumpScopeTransparency;
                    result.style = "dashed";
                }
            }),
            Node.Case(VariableDeclarationNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderValue(n.jp.code.replace("&", "&amp;")),
                );
            }),
            Node.Case(ExpressionNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderValue(n.jp.code.replace("&", "&amp;")),
                );
            }),
            Node.Case(EmptyStatementNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderSymbol(";"),
                );
            }),
            Node.Case(BreakNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderKeyword("break"),
                );
            }),
            Node.Case(ContinueNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderKeyword("continue"),
                );
            }),
            Node.Case(GotoNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderKeyword("goto"),
                    " ",
                    CoralDotFormatter.renderValue(n.jp.label.name),
                );
            }),
            Node.Case(GotoLabelNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderValue(n.jp.name),
                    CoralDotFormatter.renderSymbol(":"),
                );
            }),
            Node.Case(ReturnNode, (n) => {
                if (n.jp.returnExpr === undefined) {
                    result.label = CoralDotFormatter.renderNodeLabel(
                        n.jp,
                        CoralDotFormatter.renderKeyword("return"),
                    );
                } else {
                    result.label = CoralDotFormatter.renderNodeLabel(
                        n.jp,
                        CoralDotFormatter.renderKeyword("return"),
                        " ",
                        CoralDotFormatter.renderValue(n.jp.returnExpr.code),
                    );
                }
            }),
            Node.Case(IfNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderKeyword("if"),
                    " ",
                    CoralDotFormatter.renderSymbol("("),
                    CoralDotFormatter.renderValue(n.jp.cond.code),
                    CoralDotFormatter.renderSymbol(")"),
                );
            }),
            Node.Case(WhileNode, (n) => {
                // TODO confirm that nothing can go wrong in: while, for, for-each, do-while
                // (e.g., statement not being an expression) - and make better sugar to access it
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderKeyword("while"),
                    " ",
                    CoralDotFormatter.renderSymbol("("),
                    CoralDotFormatter.renderValue((n.jp.cond as ExprStmt).expr.code),
                    CoralDotFormatter.renderSymbol(")"),
                );
            }),
            Node.Case(DoWhileNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderKeyword("do-while"),
                    " ",
                    CoralDotFormatter.renderSymbol("("),
                    CoralDotFormatter.renderValue((n.jp.cond as ExprStmt).expr.code),
                    CoralDotFormatter.renderSymbol(")"),
                );
            }),
            Node.Case(ForNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderKeyword("for"),
                    CoralDotFormatter.renderSymbol("&nbsp;(...;"),
                    CoralDotFormatter.renderValue((n.jp.cond as ExprStmt).expr.code),
                    CoralDotFormatter.renderSymbol("; ...)"),
                );
            }),
            Node.Case(ForEachNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderKeyword("for-each"),
                    " ",
                    CoralDotFormatter.renderSymbol("&nbsp;(...;"),
                    CoralDotFormatter.renderValue(
                        (n.jp.children[3] as ExprStmt).expr.code,
                    ),
                    CoralDotFormatter.renderSymbol("; ...)"),
                );
            }),
            Node.Case(DropNode, (n) => {
                const cond = n.isDropConditional ? "conditional drop" : "drop";
                const dropped = n.accesses[0].path.toString();
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderKeyword(cond),
                    CoralDotFormatter.renderValue("&nbsp;" + dropped + "&nbsp;"),
                    CoralDotFormatter.renderKeyword(n.dropInsertLocation),
                );
            }),
            Node.Case(ClavaControlFlowNode, (n) => {
                result.label = CoralDotFormatter.renderNodeLabel(
                    n.jp,
                    CoralDotFormatter.renderUnknownNode(n.jp),
                );
            }),
        );

        if (node.is(CoralCfgNode)) {
            const coralNode = node.as(CoralCfgNode);
            
            const actions = [
                ...coralNode.accesses.map((a) => [a.kind, a.path.toString()]),
                ...coralNode.loans.map((l) => ["loan", l.toString()]),
                ...coralNode.calls.map((c) => ["call", c.jp.name]),
            ].map(([a, target]) => CoralDotFormatter.renderSmKeyword(a + "&nbsp;") + CoralDotFormatter.renderSmSymbol(target));

            const mtStates: [string, MoveTable.State][] = [
                ["uninit", MoveTable.State.UNINIT],
                ["valid", MoveTable.State.VALID],
                ["moved", MoveTable.State.MOVED],
                ["maybe u.", MoveTable.State.MAYBE_UNINIT],
                ["maybe m.", MoveTable.State.MAYBE_MOVED],
            ];
            
            const moves = mtStates
                .map(([l, s]) => [l, coralNode.moveTable.getVarNames(s).join(", ")])
                .filter(([_, s]) => s.length > 0)
                .map(([l, s]) => CoralDotFormatter.renderSmKeyword(l + "&nbsp;") + CoralDotFormatter.renderSmSymbol(s));

            result.label = CoralDotFormatter.renderMultirows(
                result.label,
                { align: "LEFT", balign: "LEFT", label: actions.join("<BR/>") },
                { align: "LEFT", balign: "LEFT", label: moves.join("<BR/>") },
            );
            
            // liveness: {
            //     defs: Map<string, Vardecl>;
            //     uses: Map<string, Vardecl>;
            //     liveIn: Map<string, Vardecl>;
            //     liveOut: Map<string, Vardecl>;
            // };
            // inScopeLoans: Set<Loan>;
        }

        // if (node.is(CoralFunctionNode)) {
        //     const coralNode = node.as(CoralFunctionNode);
        //     // result.label = CoralDotFormatter.renderMultirows(result.label, "lol");
        //     // take care of constraints and all that

        //     // symbolTable: FunctionSymbolTable;
        //     // inferRegionBoundsState: InferRegionBounds.FunctionState;
        //         // these two would make sense as a new .json, not the dot file
        
        //     // constraints: RegionConstraint[];
        // }

        result.label = `<${result.label}>`;

        if (!node.is(CoralCfgNode)) {
            result.color = CoralDotFormatter.falseColor;
        }
        return result;
    }

    /**
     * @param edge The edge to get the attributes for.
     * @returns The attributes of the edge.
     */
    static defaultGetEdgeAttrs(edge: BaseEdge.Class): Record<string, string> {
        const result: Record<string, string> = {};
        edge.switch(
            Edge.Case(ConditionalEdge, (e) => {
                if (e.executesIfTrue) {
                    result.color = CoralDotFormatter.trueColor;
                } else {
                    result.color = CoralDotFormatter.falseColor;
                }
                if (e.isFake) {
                    result.color += FlowDotFormatter.cfgEdgeTransparency;
                }
            }),
        );
        return result;
    }

    /**
     * Creates a new clava flow DOT formatter.
     */
    constructor() {
        super();
        this.addNodeAttrs(CoralDotFormatter.defaultGetNodeAttrs).addEdgeAttrs(
            CoralDotFormatter.defaultGetEdgeAttrs,
        );
    }
}

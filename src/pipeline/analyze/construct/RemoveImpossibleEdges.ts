import ConditionalEdge from "@specs-feup/clava-flow/cfg/edge/ConditionalEdge";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import GotoNode from "@specs-feup/clava-flow/cfg/node/GotoNode";
import ClavaFlowGraph from "@specs-feup/clava-flow/ClavaFlowGraph";
import { BoolLiteral, FloatLiteral, FunctionJp, IntLiteral, Literal } from "@specs-feup/clava/api/Joinpoints.js";
import Instrumentation from "@specs-feup/coral/instrumentation/Instrumentation";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import Graph from "@specs-feup/flow/graph/Graph";

export default class RemoveImpossibleEdges
    implements Graph.Transformation<ClavaFlowGraph.Class, ClavaFlowGraph.Class>
{
    #fns: FunctionJp[];
    #instrumentation: Instrumentation;

    constructor(instrumentation: Instrumentation, ...fns: FunctionJp[]) {
        this.#fns = fns;
        this.#instrumentation = instrumentation;
    }

    apply(graph: ClavaFlowGraph.Class): ClavaFlowGraph.Class {
        this.#instrumentation.pushCheckpoint(this.constructor.name);
        this.#removeImpossibleEdges(graph);
        this.#instrumentation.popCheckpoint();
        return graph;
    }

    #removeImpossibleEdges(graph: ClavaFlowGraph.Class) {
        for (const node of graph.nodes.filterIs(ConditionNode)) {
            const $condition = node.condition;
            if ($condition instanceof IntLiteral || $condition instanceof FloatLiteral || $condition instanceof BoolLiteral) {
                if ($condition.value.valueOf() === 0) {
                    node.outgoers.filterIs(ConditionalEdge).filter(e => e.executesIfTrue).forEach(e => e.isFake = true);
                } else {
                    node.outgoers.filterIs(ConditionalEdge).filter(e => e.executesIfFalse).forEach(e => e.isFake = true);
                }
            }
        }
    }
}

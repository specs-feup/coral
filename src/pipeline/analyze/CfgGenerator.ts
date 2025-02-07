import GotoNode from "@specs-feup/clava-flow/cfg/node/GotoNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import ClavaFlowGraph from "@specs-feup/clava-flow/ClavaFlowGraph";
import ClavaCfgGenerator from "@specs-feup/clava-flow/transformation/ClavaCfgGenerator";
import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import Instrumentation from "@specs-feup/coral/instrumentation/Instrumentation";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import BaseGraph from "@specs-feup/flow/graph/BaseGraph";
import Graph from "@specs-feup/flow/graph/Graph";

export default class CfgGenerator
    implements Graph.Transformation<BaseGraph.Class, ClavaFlowGraph.Class>
{
    #fns: FunctionJp[];
    #instrumentation: Instrumentation;

    constructor(instrumentation: Instrumentation, ...fns: FunctionJp[]) {
        this.#fns = fns;
        this.#instrumentation = instrumentation;
    }

    apply(graph: BaseGraph.Class): ClavaFlowGraph.Class {
        this.#instrumentation.pushCheckpoint(this.constructor.name);
        const ograph = graph.apply(new ClavaCfgGenerator(...this.#fns));
        this.#removeFakeEdges(ograph);
        this.#instrumentation.popCheckpoint();
        return ograph;
    }

    /**
     * Returns have the true and fake paths.
     * Since the true path goes to the end node, the fake path is not
     * needed for postdominance and can be safely removed.
     */
    #removeFakeEdges(graph: ClavaFlowGraph.Class) {
        // TODO clean unreachable nodes
        for (const edge of graph.edges.filterIs(ControlFlowEdge).filter(e => e.isFake)) {
            if (edge.source.is(GotoNode)) {
                // gotos may have post dominance issues
                continue;
            }
            edge.toCy().remove();
        }
    }
}
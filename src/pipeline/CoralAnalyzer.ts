import ClavaCfgGenerator from "@specs-feup/clava-flow/transformation/ClavaCfgGenerator";
import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import { CoralConfig } from "@specs-feup/coral/Coral";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import Graph from "@specs-feup/flow/graph/Graph";
import IncrementingIdGenerator from "@specs-feup/flow/graph/id/IncrementingIdGenerator";

export default class CoralAnalyzer {
    #config: CoralConfig;

    constructor(config: CoralConfig) {
        this.#config = config;
    }

    apply($fns: FunctionJp[]) {
        Graph.create()
            .setNodeIdGenerator(new IncrementingIdGenerator("node_"))
            .setEdgeIdGenerator(new IncrementingIdGenerator("edge_"))
            .apply(new ClavaCfgGenerator(...$fns))
            .init(new CoralGraph.Builder(this.#config))
            .as(CoralGraph);

        // .apply(
        //     new FilterFlowNodes(
        //         (node) =>
        //             // !node.is(EmptyStatementNode.TypeGuard) &&
        //             // !node.is(BreakNode.TypeGuard) &&
        //             // !node.is(ContinueNode.TypeGuard) &&
        //             // !node.is(GotoLabelNode.TypeGuard) &&
        //             // !node.is(GotoNode.TypeGuard) &&
        //             !node.is(CommentNode.TypeGuard) && !node.is(PragmaNode.TypeGuard),
        //     ),
        // )
        // .apply(new GraphAnnotator())
        // .apply(new MoveAnalyser())
        // .apply(new AddDrops())
        // // TODO liveness analysis does not handle structs correctly
        // .apply(
        //     new InferLiveness().customComputeDefsAndUses(
        //         CustomLivenessComputation.computeDefsAndUses,
        //     ),
        // )
        // .apply(
        //     new InferLifetimeBounds(this.#inferFunctionLifetimes, this.#iterationLimit),
        // )
        // .apply(new RegionckPipeline(this.#debug))
        // .apply(new DropElaboration());
    }
}

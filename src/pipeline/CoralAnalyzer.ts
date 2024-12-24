import ClavaCfgGenerator from "@specs-feup/clava-flow/transformation/ClavaCfgGenerator";
import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import { CoralConfig } from "@specs-feup/coral/Coral";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import CoralAnnotator from "@specs-feup/coral/pipeline/analyze/annotate/CoralAnnotator";
import AddDrops from "@specs-feup/coral/pipeline/analyze/move/AddDrops";
import MoveAnalyser from "@specs-feup/coral/pipeline/analyze/move/MoveAnalyser";
import CustomLivenessComputation from "@specs-feup/coral/pipeline/analyze/regionck/CustomLivenessComputation";
import RegionckPipeline from "@specs-feup/coral/pipeline/analyze/regionck/RegionckPipeline";
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
            .init(new CoralGraph.Builder(this.#config, $fns))
            .as(CoralGraph)
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
            .apply(new CoralAnnotator())
            .apply(new MoveAnalyser())
            .apply(new AddDrops())
            .apply(new CustomLivenessComputation())
            .apply(new RegionckPipeline());
    }
}

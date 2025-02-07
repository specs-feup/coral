import ClavaCfgGenerator from "@specs-feup/clava-flow/transformation/ClavaCfgGenerator";
import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import { CoralConfig } from "@specs-feup/coral/Coral";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import Instrumentation from "@specs-feup/coral/instrumentation/Instrumentation";
import CoralAnnotator from "@specs-feup/coral/pipeline/analyze/annotate/CoralAnnotator";
import CfgGenerator from "@specs-feup/coral/pipeline/analyze/CfgGenerator";
import AddDrops from "@specs-feup/coral/pipeline/analyze/move/AddDrops";
import MoveAnalyser from "@specs-feup/coral/pipeline/analyze/move/MoveAnalyser";
import CustomLivenessComputation from "@specs-feup/coral/pipeline/analyze/regionck/CustomLivenessComputation";
import RegionckPipeline from "@specs-feup/coral/pipeline/analyze/regionck/RegionckPipeline";
import Graph from "@specs-feup/flow/graph/Graph";
import IncrementingIdGenerator from "@specs-feup/flow/graph/id/IncrementingIdGenerator";

export default class CoralAnalyzer {
    #config: CoralConfig;
    #instrumentation: Instrumentation;

    constructor(config: CoralConfig, instrumentation: Instrumentation) {
        this.#config = config;
        this.#instrumentation = instrumentation
    }

    apply($fns: FunctionJp[]): CoralGraph.Class {
        this.#instrumentation.pushCheckpoint("Analysis");
        const graph = Graph.create()
            .setNodeIdGenerator(new IncrementingIdGenerator("node_"))
            .setEdgeIdGenerator(new IncrementingIdGenerator("edge_"))
            .apply(new CfgGenerator(this.#instrumentation, ...$fns))
            .init(new CoralGraph.Builder(this.#config, this.#instrumentation, $fns))
            .as(CoralGraph)
            .apply(new CoralAnnotator())
            .apply(new MoveAnalyser())
            .apply(new AddDrops())
            .apply(new CustomLivenessComputation())
            .apply(new RegionckPipeline());
        this.#instrumentation.popCheckpoint();
        return graph;
    }
}

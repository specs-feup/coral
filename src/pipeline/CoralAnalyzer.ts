import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import { CoralConfig } from "@specs-feup/coral/Coral";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import Instrumentation from "@specs-feup/coral/instrumentation/Instrumentation";
import AddFakeUnwind from "@specs-feup/coral/pipeline/analyze/construct/AddFakeUnwind";
import CfgGenerator from "@specs-feup/coral/pipeline/analyze/construct/CfgGenerator";
import RemoveDeadCode from "@specs-feup/coral/pipeline/analyze/construct/RemoveDeadCode";
import RemoveImpossibleEdges from "@specs-feup/coral/pipeline/analyze/construct/RemoveImpossibleEdges";
import AddDrops from "@specs-feup/coral/pipeline/analyze/move/AddDrops";
import MoveAnalyser from "@specs-feup/coral/pipeline/analyze/move/MoveAnalyser";
import CustomLivenessComputation from "@specs-feup/coral/pipeline/analyze/regionck/CustomLivenessComputation";
import RegionckPipeline from "@specs-feup/coral/pipeline/analyze/regionck/RegionckPipeline";
import Graph from "@specs-feup/flow/graph/Graph";
import IncrementingIdGenerator from "@specs-feup/flow/graph/id/IncrementingIdGenerator";

import DefMap from "@specs-feup/coral/symbol/DefMap";
import NullabilityAnnotator from "./analyze/annotate/NullabilityAnnotator.js";
import NullabilityPipeline from "./analyze/nullck/NullabilityPipeline.js";
import SignatureAnnotator from "./analyze/annotate/SignatureAnnotator.js";
import ControlFlowAnnotator from "./analyze/annotate/ControlFlowAnnotator.js";



export default class CoralAnalyzer {
    #config: CoralConfig;
    #instrumentation: Instrumentation;

    constructor(config: CoralConfig, instrumentation: Instrumentation) {
        this.#config = config;
        this.#instrumentation = instrumentation;
    }

    apply($fns: FunctionJp[]): CoralGraph.Class {
        this.#instrumentation.pushCheckpoint("Analysis");
        console.log("Ha")
        DefMap.ENFORCE_STRICT_LIFETIMES = this.#config.enableBorrowChecker === true;
        console.log("he")

        // 1. Base Pipeline (Always runs)
        // Builds the initial AST -> CFG -> MIR mapping
        let graph = Graph.create()
            .setNodeIdGenerator(new IncrementingIdGenerator("node_"))
            .setEdgeIdGenerator(new IncrementingIdGenerator("edge_"))
            .apply(new CfgGenerator(this.#instrumentation, ...$fns))
            .init(new CoralGraph.Builder(this.#config, this.#instrumentation, $fns))
            .as(CoralGraph)
            .apply(new RemoveImpossibleEdges())
            .apply(new AddFakeUnwind())
            .apply(new RemoveDeadCode())
            

        // 2. Ownership & Borrow Checker Pipeline
        // Defaults to true if not explicitly set to false
        if (this.#config.enableBorrowChecker === true) {
            console.log("Borrow checker")
            graph = graph
                .apply(new SignatureAnnotator())
                .apply(new ControlFlowAnnotator()) 
                .apply(new MoveAnalyser())
                .apply(new AddDrops())
                .apply(new CustomLivenessComputation())
                .apply(new RegionckPipeline());
        }

        // 3. Nullability Pipeline
        // Defaults to true if not explicitly set to false
        if (this.#config.enableNullability === true) {
            console.log("Nullabili checker")
            graph = graph
                //.apply(new SignatureAnnotator())
                .apply(new NullabilityAnnotator())
                //.apply(new ControlFlowAnnotator()) 
                .apply(new NullabilityPipeline());
        }

        this.#instrumentation.popCheckpoint();
        return graph;
    }
}
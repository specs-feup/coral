import Query from "lara-js/api/weaver/Query.js";
import { FileJp, FunctionJp, Program, Scope, Statement } from "clava-js/api/Joinpoints.js";

import CoralNormalizer from "coral/normalize/CoralNormalizer";
import FlowGraph from "clava-flow/flow/FlowGraph";
import CoralDotFormatter from "coral/graph/dot/CoralDotFormatter";
import CoralGraph from "coral/graph/CoralGraph";
import InferLiveness from "clava-flow/flow/transformation/liveness/InferLiveness";
import FilterFlowNodes from "clava-flow/flow/transformation/FilterFlowNodes";
import CommentNode from "clava-flow/flow/node/instruction/CommentNode";
import PragmaNode from "clava-flow/flow/node/instruction/PragmaNode";
import GraphAnnotator from "coral/pass/GraphAnnotator";
import MoveAnalyser from "coral/pass/MoveAnalyser";
import Graph from "clava-flow/graph/Graph";
import IncrementingIdGenerator from "clava-flow/graph/id/IncrementingIdGenerator";
import RegionckPipeline from "coral/pass/RegionckPipeline";
import InferLifetimeBounds from "coral/pass/InferLifetimeBounds";
import SimplifyAssignments from "coral/normalize/pass/SimplifyAssignments";
import AddAssignmentsToCallsAndBorrows from "coral/normalize/pass/AddAssignmentsToCallsAndBorrows";
import AddDrops from "coral/pass/AddDrops";
import CustomLivenessComputation from "coral/pass/CustomLivenessComputation";

export default class CoralPipeline {
    #debug: boolean;
    #inferFunctionLifetimes: boolean;
    #iterationLimit?: number;
    #mirDotFile: string | undefined;
    #livenessDotFile: string | undefined;

    constructor() {
        this.#debug = false;
        this.#inferFunctionLifetimes = false;
        this.#mirDotFile = undefined;
        this.#livenessDotFile = undefined;
    }

    writeMirToDotFile(path: string): CoralPipeline {
        this.#mirDotFile = path;
        return this;
    }

    writeLivenessToDotFile(path: string): CoralPipeline {
        this.#livenessDotFile = path;
        return this;
    }

    inferFunctionLifetimes(iterationLimit = undefined): CoralPipeline {
        this.#inferFunctionLifetimes = true;
        this.#iterationLimit = iterationLimit;
        return this;
    }

    debug(): CoralPipeline {
        this.#debug = true;
        return this;
    }

    apply($root?: Program | FileJp | FunctionJp) {
        if ($root === undefined) {
            $root = Query.root() as Program;
        }

        // new CoralNormalizer().apply($root);

        const baseGraph = Graph.create()
            .setNodeIdGenerator(new IncrementingIdGenerator("node_"))
            .setEdgeIdGenerator(new IncrementingIdGenerator("edge_"));
        const graph = FlowGraph.generate($root, baseGraph)
            .init(new CoralGraph.Builder())
            .as(CoralGraph.Class)
            .apply(
                new FilterFlowNodes(
                    (node) =>
                        // !node.is(EmptyStatementNode.TypeGuard) &&
                        // !node.is(BreakNode.TypeGuard) &&
                        // !node.is(ContinueNode.TypeGuard) &&
                        // !node.is(GotoLabelNode.TypeGuard) &&
                        // !node.is(GotoNode.TypeGuard) &&
                        !node.is(CommentNode.TypeGuard) &&
                        !node.is(PragmaNode.TypeGuard)
                ),
            )
            .apply(new GraphAnnotator())
            .apply(new MoveAnalyser())
            .apply(new AddDrops())
            .apply(new InferLiveness().customComputeDefsAndUses(CustomLivenessComputation.computeDefsAndUses)) // TODO liveness analysis does not handle structs correctly
            .apply(new InferLifetimeBounds(this.#inferFunctionLifetimes, this.#iterationLimit))
            .apply(new RegionckPipeline(this.#debug))
            // TODO drop elaboration
            ;
        
        if (this.#mirDotFile) {
            graph.toDotFile(new CoralDotFormatter(), this.#mirDotFile);
        }
    }
}

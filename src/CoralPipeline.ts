import Query from "lara-js/api/weaver/Query.js";
import { FileJp, FunctionJp, Joinpoint, Program } from "clava-js/api/Joinpoints.js";

import CoralNormalizer from "coral/CoralNormalizer";
import CoralAnalyser from "coral/CoralAnalyser";
import FlowGraph from "clava-flow/flow/FlowGraph";
import CoralDotFormatter from "coral/graph/dot/CoralDotFormatter";
import CoralGraph from "coral/graph/CoralGraph";
import InferLiveness from "clava-flow/flow/transformation/liveness/InferLiveness";
import FilterFlowNodes from "clava-flow/flow/transformation/FilterFlowNodes";
import EmptyStatementNode from "clava-flow/flow/node/instruction/EmptyStatementNode";
import BreakNode from "clava-flow/flow/node/instruction/BreakNode";
import ContinueNode from "clava-flow/flow/node/instruction/ContinueNode";
import GotoLabelNode from "clava-flow/flow/node/instruction/GotoLabelNode";
import GotoNode from "clava-flow/flow/node/instruction/GotoNode";
import CommentNode from "clava-flow/flow/node/instruction/CommentNode";
import PragmaNode from "clava-flow/flow/node/instruction/PragmaNode";
import GraphAnnotator from "coral/pass/GraphAnnotator";
import ConstraintGenerator from "coral/pass/ConstraintGenerator";
import InScopeLoansComputation from "coral/pass/InScopeLoansComputation";
import RegionckErrorReporting from "coral/pass/RegionckErrorReporting";

export default class CoralPipeline {
    #debug: boolean;
    #mirDotFile: string | undefined;
    #livenessDotFile: string | undefined;

    constructor() {
        this.#debug = false;
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

    debug(): CoralPipeline {
        this.#debug = true;
        return this;
    }

    apply($root?: Program | FileJp | FunctionJp) {
        if ($root === undefined) {
            $root = Query.root() as Program;
        }

        new CoralNormalizer().apply($root);

        const graph = FlowGraph.generate($root)
            .init(new CoralGraph.Builder())
            .as(CoralGraph.Class)
            .apply(new InferLiveness())
            .apply(
                new FilterFlowNodes(
                    (node) =>
                        !node.is(EmptyStatementNode.TypeGuard) &&
                        !node.is(BreakNode.TypeGuard) &&
                        !node.is(ContinueNode.TypeGuard) &&
                        !node.is(GotoLabelNode.TypeGuard) &&
                        !node.is(GotoNode.TypeGuard) &&
                        !node.is(CommentNode.TypeGuard) &&
                        !node.is(PragmaNode.TypeGuard),
                ),
            )
            .apply(new GraphAnnotator())
            // .apply(new ConstraintGenerator())
            // .apply(new InScopeLoansComputation())
            // .apply(new RegionckErrorReporting())
            ;

        if (this.#mirDotFile) {
            graph.toDotFile(new CoralDotFormatter(), this.#mirDotFile);
        }
    }

    // const regionck = new Regionck($jp).prepare(this.#debug);
    // regionck.borrowCheck();
}

// class LivenessDotFormatter extends DotFormatter {
//     constructor(liveness: LivenessAnalysis) {
//         super();

//         this.setEdgeLabelFormatter((edge) => {
//             const from = edge.source().id();
//             return Array.from(liveness.liveOut.get(from) ?? []).join(" ");
//         });
//     }
// }


// class MirDotFormatter extends DotFormatter {
//     constructor() {
//         super();

//         this.setNodeLabelFormatter((node) => {
//             return `[${node.id()}] ${node.data().toString()}`;
//         });

//         this.setEdgeLabelFormatter((edge) => {
//             const sections = new Map();

//             const from = edge.source();
//             const scratch = from.scratch("_coral");

//             if (scratch.loan !== undefined) {
//                 sections.set("Loan", scratch.loan.toString() + "\n");
//             }

//             if (scratch.inScopeLoans.size > 0) {
//                 let str = "";
//                 for (const loan of scratch.inScopeLoans.keys()) {
//                     str += loan.toString() + "\n";
//                 }
//                 sections.set("In-scope loans", str + "\n");
//             }

//             if (scratch.accesses.length > 0) {
//                 sections.set(
//                     "Accesses",
//                     (scratch.accesses as Access[]).map((a) => a.toString()).join("\n") +
//                         "\n",
//                 );
//             }

//             let ret = "";
//             for (const [key, value] of sections) {
//                 ret += `${key}:\n${value}\n`;
//             }
//             return ret;
//         });
//     }
// }

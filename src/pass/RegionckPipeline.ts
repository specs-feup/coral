import Pass from "@specs-feup/lara/api/lara/pass/Pass.js";
import cytoscape from "@specs-feup/lara/api/libs/cytoscape-3.26.0.js";
import PassResult from "@specs-feup/lara/api/lara/pass/results/PassResult.js";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";

import Loan from "coral/mir/Loan";
import Access from "coral/mir/Access";
import { GraphTransformation } from "clava-flow/graph/Graph";
import CoralGraph from "coral/graph/CoralGraph";
import BaseGraph from "clava-flow/graph/BaseGraph";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import FlowNode from "clava-flow/flow/node/FlowNode";
import CoralNode from "coral/graph/CoralNode";
import ConstraintGenerator from "coral/pass/ConstraintGenerator";
import InScopeLoansComputation from "coral/pass/InScopeLoansComputation";
import RegionckErrorReporting from "coral/pass/RegionckErrorReporting";

export default class RegionckPipeline implements GraphTransformation {
    #debug: boolean;

    constructor(debug: boolean = false) {
        this.#debug = debug;
    }

    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("InScopeLoansComputation can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            coralGraph
                .apply(new ConstraintGenerator(functionEntry, this.#debug))
                .apply(new InScopeLoansComputation(functionEntry))
                .apply(new RegionckErrorReporting());
        }
    }
}

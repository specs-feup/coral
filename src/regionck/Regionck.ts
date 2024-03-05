import LivenessAnalysis from "clava-js/api/clava/liveness/LivenessAnalysis.js";
import ControlFlowGraph from "clava-js/api/clava/graphs/ControlFlowGraph.js";
import { FunctionJp, Joinpoint, Statement } from "clava-js/api/Joinpoints.js";

import Loan from "../mir/Loan.js";
import Ty from "../mir/ty/Ty.js";
import OutlivesConstraint from "./OutlivesConstraint.js";
import RegionVariable from "./RegionVariable.js";
import CfgAnnotator from "../pass/CfgAnnotator.js";
import ConstraintGenerator from "../pass/ConstraintGenerator.js";
import InScopeLoansComputation from "../pass/InScopeLoansComputation.js";
import RegionckErrorReporting from "../pass/RegionckErrorReporting.js";

export default class Regionck {
    $jp: FunctionJp;
    cfg: ControlFlowGraph;
    liveness: LivenessAnalysis;
    constraints: OutlivesConstraint[];
    regions: RegionVariable[];
    loans: Loan[];
    declarations: Map<string, Ty>;

    constructor($jp: FunctionJp) {
        this.constraints = [];
        this.regions = [];
        this.loans = [];
        this.declarations = new Map();

        this.$jp = $jp;
        // TODO this conversion doesn't make any sense. But it's what the original code does
        this.cfg = ControlFlowGraph.build($jp as Joinpoint as Statement, true, true);

        this.liveness = LivenessAnalysis.analyse(this.cfg);

        const cfgAnnotator = new CfgAnnotator(this);
        cfgAnnotator.apply($jp);
    }

    /**
     * @param {boolean} [printConstraintSet=false] If true, prints the constraint set
     */
    prepare(debug: boolean): Regionck {
        this.#buildConstraints();
        if (debug) {
            console.log("Initial Constraint Set:");
            console.log(this.aggregateRegionckInfo() + "\n\n");
        }
        this.#infer();
        this.#calculateInScopeLoans();
        if (debug) {
            console.log("After Inference:");
            console.log(this.aggregateRegionckInfo() + "\n\n");
        }
        return this;
    }

    #buildConstraints(): Regionck {
        const constraintGenerator = new ConstraintGenerator(this);
        constraintGenerator.apply(this.$jp);

        return this;
    }

    #infer(): Regionck {
        let changed = true;
        while (changed) {
            changed = false;

            for (const constraint of this.constraints) {
                changed ||= constraint.apply(this);
            }
        }

        return this;
    }

    #calculateInScopeLoans() {
        let inScopeComputation = new InScopeLoansComputation(this.cfg.startNode);
        inScopeComputation.apply(this.$jp);
    }

    borrowCheck(): Regionck {
        let errorReporting = new RegionckErrorReporting(this.cfg.startNode);
        errorReporting.apply(this.$jp);

        return this;
    }

    aggregateRegionckInfo(): string {
        let result = "Regions:\n";
        for (const region of this.regions) {
            const points = Array.from(region.points).sort();
            result += `\t'${region.name}: {${points.join(", ")}}\n`;
        }

        result += "\nConstraints:\n";
        for (const constraint of this.constraints) {
            result += `\t${constraint.toString()}\n`;
        }

        return result;
    }
}

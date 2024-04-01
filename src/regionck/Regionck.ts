import LivenessAnalysis from "clava-js/api/clava/liveness/LivenessAnalysis.js";
import ControlFlowGraph from "clava-js/api/clava/graphs/ControlFlowGraph.js";
import { FunctionJp, Joinpoint, Statement } from "clava-js/api/Joinpoints.js";

import Loan from "coral/mir/Loan";
import Ty from "coral/mir/ty/Ty";
import OutlivesConstraint from "coral/regionck/OutlivesConstraint";
import RegionVariable from "coral/regionck/RegionVariable";
import CfgAnnotator from "coral/pass/CfgAnnotator";
import ConstraintGenerator from "coral/pass/ConstraintGenerator";
import InScopeLoansComputation from "coral/pass/InScopeLoansComputation";
import RegionckErrorReporting from "coral/pass/RegionckErrorReporting";

export default class Regionck {
    $jp: FunctionJp;
    cfg: ControlFlowGraph;
    liveness: LivenessAnalysis;
    constraints: OutlivesConstraint[];
    regions: RegionVariable[];
    loans: Loan[];
    declarations: Map<string, Ty>; // TODO get rid of this

    constructor($jp: FunctionJp) {
        this.constraints = [];
        this.regions = [];
        this.loans = [];
        this.declarations = new Map();

        this.$jp = $jp;
        this.cfg = ControlFlowGraph.build($jp.body, true, true);

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
        const inScopeComputation = new InScopeLoansComputation(this.cfg.startNode);
        inScopeComputation.apply(this.$jp);
    }

    borrowCheck(): Regionck {
        const errorReporting = new RegionckErrorReporting(this.cfg.startNode);
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

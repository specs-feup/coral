import Io from "lara-js/api/lara/Io.js";
import ControlFlowGraph from "clava-js/api/clava/graphs/ControlFlowGraph.js";
import LivenessAnalysis from "clava-js/api/clava/liveness/LivenessAnalysis.js";

import OutlivesConstraint from "./OutlivesConstraint.js";
import LivenessDotFormatter from "../dotFormatters/LivenessDotFormatter.js";
import MirDotFormatter from "../dotFormatters/MirDotFormatter.js";
import RegionVariable from "./RegionVariable.js";
import CfgAnnotator from "../pass/CfgAnnotator.js";
import ConstraintGenerator from "../pass/ConstraintGenerator.js";
import InScopeLoansComputation from "../pass/InScopeLoansComputation.js";
import BcErrorReporting from "../pass/BcErrorReporting.js";

export default class Regionck {

    /**
     * @type {JoinPoint} Function JoinPoint
     */
    jp;
    /**
     * @type {ControlFlowGraph}
     */
    cfg;
    /**
     * @type {LivenessAnalysis}
     */
    liveness;
    /**
     * @type {OutlivesConstraint[]}
     */
    constraints;

    regions;
    /**
     * @type {Loan[]}
     */
    loans;

    /**
     * @type {Map<string, Ty>}
     */
    declarations;

    constructor($jp) {
        this.constraints = [];
        this.regions = [];
        this.loans = [];
        this.declarations = new Map();

        this.$jp = $jp;
        this.cfg = ControlFlowGraph.build($jp, true, { splitInstList: true });

        this.liveness = LivenessAnalysis.analyse(this.cfg);
        // console.log(this.cfg.toDot(new LivenessDotFormatter(this.liveness)) + "\n\n");
        
        const cfgAnnotator = new CfgAnnotator(this);
        cfgAnnotator.apply($jp);
    }

    /**
     * @param {boolean} [printConstraintSet=false] If true, prints the constraint set
     */
    prepare(printConstraintSet = false) {
        this.#buildConstraints();
        if (printConstraintSet) {
            console.log("Initial Constraint Set:");
            console.log(this.aggregateRegionckInfo() + "\n\n");
        }
        this.#infer();
        this.#calculateInScopeLoans();
        return this;
    }

    mirToDotFile() {
        Io.writeFile("../out/dot/mir.gv", this.cfg.toDot(new MirDotFormatter()));
    }


    #buildConstraints() {
        const constraintGenerator = new ConstraintGenerator(this);
        constraintGenerator.apply(this.$jp);

        return this;
    }

    #infer() {
        let changed = true;
        while (changed) {
            changed = false;

            for (const constraint of this.constraints) {
                changed |= constraint.apply(this);
            }
        }

        return this;
    }

    #calculateInScopeLoans() {
        let inScopeComputation = new InScopeLoansComputation(this.cfg.startNode);
        inScopeComputation.apply(this.$jp);
    }

    borrowCheck() {
        let errorReporting = new BcErrorReporting(this.cfg.startNode);
        errorReporting.apply(this.$jp);

        return this;
    }

    aggregateRegionckInfo() {
        let ret = "Regions:\n";
        for (const region of this.regions) {
            const points = Array.from(region.points).sort();
            ret += `\t'${region.name}: {${points.join(', ')}}\n`;
        }

        ret += "\nConstraints:\n";
        for (const constraint of this.constraints) {
            ret += `\t${constraint.toString()}\n`;
        }

        return ret;
    }
}
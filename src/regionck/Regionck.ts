import { Vardecl } from "clava-js/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";
import OutlivesConstraint from "coral/regionck/OutlivesConstraint";
import RegionVariable from "coral/regionck/RegionVariable";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";


export default class Regionck {
    functionEntry: FunctionEntryNode.Class;
    #constraints: OutlivesConstraint[];
    #regionVars: RegionVariable[];
    #symbolTable: Map<string, Ty>;

    constructor(functionEntry: FunctionEntryNode.Class) {
        this.#constraints = [];
        this.#regionVars = [];
        this.#symbolTable = new Map();
        this.functionEntry = functionEntry;
    }

    getTy($varDecl: Vardecl): Ty | undefined {
        return this.#symbolTable.get($varDecl.astId);
    }

    registerTy($varDecl: Vardecl, ty: Ty): void {
        this.#symbolTable.set($varDecl.astId, ty);
    }

    newRegionVar(kind: RegionVariable.Kind, name?: string): RegionVariable {
        const id = this.#regionVars.length;
        const regionVar = new RegionVariable(
            id.toString(),
            kind,
            name? name : id.toString(),
        );
        this.#regionVars.push(regionVar);
        return regionVar;
    }

    // prepare(debug: boolean): Regionck {
    //     this.#buildConstraints();
    //     if (debug) {
    //         console.log("Initial Constraint Set:");
    //         console.log(this.aggregateRegionckInfo() + "\n\n");
    //     }
    //     this.#infer();
    //     this.#calculateInScopeLoans();
    //     if (debug) {
    //         console.log("After Inference:");
    //         console.log(this.aggregateRegionckInfo() + "\n\n");
    //     }
    //     return this;
    // }

    // #buildConstraints(): Regionck {
    //     const constraintGenerator = new ConstraintGenerator(this);
    //     constraintGenerator.apply(this.$function);

    //     return this;
    // }

    // #infer(): Regionck {
    //     let changed = true;
    //     while (changed) {
    //         changed = false;

    //         for (const constraint of this.constraints) {
    //             changed ||= constraint.apply(this);
    //         }
    //     }

    //     return this;
    // }

    // #calculateInScopeLoans() {
    //     const inScopeComputation = new InScopeLoansComputation(this.cfg.startNode);
    //     inScopeComputation.apply(this.$function);
    // }

    // borrowCheck(): Regionck {
    //     const errorReporting = new RegionckErrorReporting(this.cfg.startNode);
    //     errorReporting.apply(this.$function);

    //     return this;
    // }

    // aggregateRegionckInfo(): string {
    //     let result = "Regions:\n";
    //     for (const region of this.regions) {
    //         const points = Array.from(region.points).sort();
    //         result += `\t'${region.name}: {${points.join(", ")}}\n`;
    //     }

    //     result += "\nConstraints:\n";
    //     for (const constraint of this.constraints) {
    //         result += `\t${constraint.toString()}\n`;
    //     }

    //     return result;
    // }
}

import OutlivesConstraint from "coral/regionck/OutlivesConstraint";
import RegionVariable from "coral/regionck/RegionVariable";
import Regionck from "coral/regionck/Regionck";
import PathDeref from "coral/mir/path/PathDeref";
import Ty from "coral/mir/ty/Ty";
import RefTy from "coral/mir/ty/RefTy";
import BuiltinTy from "coral/mir/ty/BuiltinTy";
import StructTy from "coral/mir/ty/StructTy";
import Variance from "coral/mir/ty/Variance";
import BorrowKind from "coral/mir/ty/BorrowKind";
import Loan from "coral/mir/Loan";
import { GraphTransformation } from "clava-flow/graph/Graph";
import BaseGraph from "clava-flow/graph/BaseGraph";
import CoralGraph from "coral/graph/CoralGraph";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import CoralNode from "coral/graph/CoralNode";

export default class ConstraintGenerator implements GraphTransformation {
    #regionck?: Regionck;
    #debug: boolean;

    constructor(debug: boolean = false) {
        this.#debug = debug;
    }

    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("ConstraintGenerator can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            this.#regionck = coralGraph.getRegionck(functionEntry);
            this.#processFunction(functionEntry);

            if (this.#debug) {
                console.log(`Initial Constraint Set for ${functionEntry.jp.name}:`);
                console.log(this.#regionck!.debugInfo());
            }

            this.#inferConstraints();

            if (this.#debug) {
                console.log(
                    `Constraint Set for ${functionEntry.jp.name} after inference:`,
                );
                console.log(this.#regionck!.debugInfo());
            }
        }
    }

    #processFunction(functionEntry: FunctionEntryNode.Class) {
        for (const region of this.#regionck!.universalRegionVars) {
            region.points.add(`end(${region.name})`);
        }

        for (const node of functionEntry.reachableNodes) {
            if (!node.is(CoralNode.TypeGuard)) {
                continue;
            }

            const coralNode = node.as(CoralNode.Class);

            // Insert CFG into universal regions
            for (const region of this.#regionck!.universalRegionVars) {
                region.points.add(node.id);
            }

            // Lifetime constraints
            for (const variable of coralNode.liveIn.keys()) {
                const ty = this.#regionck!.getTy(variable);
                if (ty === undefined) {
                    throw new Error(
                        `ConstraintGenerator: variable ${variable.name} not found in declarations`,
                    );
                }
                for (const region of ty.nestedRegionVars) {
                    region.points.add(node.id);
                }
            }

            // Other constraints
            const loan = coralNode.loan;
            if (loan !== undefined) {
                const successors = node.outgoers.map((e) => e.target);
                if (successors.length != 1) {
                    throw new Error(
                        `ConstraintGenerator: node ${node.id} has ${successors.length} successors and a loan`,
                    );
                }
                if (!successors[0].is(CoralNode.TypeGuard)) {
                    throw new Error(
                        `ConstraintGenerator: successor of node ${node.id} is not a CoralNode`,
                    );
                }
                const successor = successors[0].as(CoralNode.Class);

                this.#subtypingConstraints(loan, successor);
                if (loan.reborrow) {
                    this.#reborrowConstraints(loan, successor);
                }
            }
        }
    }

    #subtypingConstraints(loan: Loan, successor: CoralNode.Class) {
        // TODO: Missing constraints from parameters (maybe can be covered though assignment w/ proper annotations?)
        this.#relateTy(loan.leftTy, loan.loanedRefTy, Variance.CO, successor);
    }

    #reborrowConstraints(loan: Loan, successor: CoralNode.Class) {
        for (const path of loan.loanedPath.supportingPrefixes) {
            if (!(path instanceof PathDeref)) continue;

            this.#relateRegions(
                path.innerTy.regionVar,
                loan.regionVar,
                Variance.CONTRA,
                successor,
            );
        }
    }

    #relateTy(ty1: Ty, ty2: Ty, variance: Variance, successor: CoralNode.Class) {
        if (ty1 instanceof RefTy && ty2 instanceof RefTy) {
            this.#relateRegions(
                ty1.regionVar,
                ty2.regionVar,
                Variance.xform(variance, Variance.CO),
                successor,
            );
            this.#relateTy(
                ty1.referent,
                ty2.referent,
                Variance.xform(
                    variance,
                    ty1.borrowKind == BorrowKind.MUTABLE ? Variance.IN : Variance.CO,
                ),
                successor,
            );
            return;
        }

        if (ty1 instanceof StructTy && ty2 instanceof StructTy) {
            if (ty1.name != ty2.name) {
                throw new Error(
                    `Cannot relate types ${ty1.toString()} and ${ty2.toString()}, different kinds or names`,
                );
            }
            if (ty1.regionVars.length != ty2.regionVars.length) {
                throw new Error(
                    `Cannot relate types ${ty1.toString()} and ${ty2.toString()}, different number of lifetimes`,
                );
            }

            for (let i = 0; i < ty1.regionVars.length; i++) {
                // TODO: May need to be changed to go parameter by paramenter, which would require changes to the StructTy
                this.#relateRegions(
                    ty1.regionVars[i],
                    ty2.regionVars[i],
                    Variance.xform(variance, Variance.IN),
                    successor,
                );
            }

            return;
        }

        if (ty1 instanceof BuiltinTy && ty2 instanceof BuiltinTy) {
            return;
        }

        throw new Error(`Cannot relate types ${ty1.toString()} and ${ty2.toString()}`);
    }

    #relateRegions(
        region1: RegionVariable,
        region2: RegionVariable,
        variance: Variance,
        successor: CoralNode.Class,
    ) {
        switch (variance) {
            case Variance.CO: // "a Co b" == "a <= b"
                this.#regionck!.constraints.push(
                    new OutlivesConstraint(region2, region1, successor),
                );
                break;
            case Variance.CONTRA: // "a Contra b" == "a >= b"
                this.#regionck!.constraints.push(
                    new OutlivesConstraint(region1, region2, successor),
                );
                break;
            case Variance.IN: // "a In b" == "a == b"
                this.#regionck!.constraints.push(
                    new OutlivesConstraint(region2, region1, successor),
                );
                this.#regionck!.constraints.push(
                    new OutlivesConstraint(region1, region2, successor),
                );
                break;
        }
    }

    #inferConstraints() {
        let changed = true;
        while (changed) {
            changed = false;

            for (const constraint of this.#regionck!.constraints) {
                changed ||= constraint.apply();
            }
        }
    }
}

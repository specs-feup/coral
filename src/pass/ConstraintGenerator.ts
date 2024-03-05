import Pass from "lara-js/api/lara/pass/Pass.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import { Joinpoint } from "clava-js/api/Joinpoints.js";
import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";

import OutlivesConstraint from "../regionck/OutlivesConstraint.js";
import RegionVariable from "../regionck/RegionVariable.js";
import Regionck from "../regionck/Regionck.js";
import PathDeref from "../mir/path/PathDeref.js";
import Ty from "../mir/ty/Ty.js";
import RefTy from "../mir/ty/RefTy.js";
import BuiltinTy from "../mir/ty/BuiltinTy.js";
import ElaboratedTy from "../mir/ty/ElaboratedTy.js";
import Variance from "../mir/ty/Variance.js";
import BorrowKind from "../mir/ty/BorrowKind.js";
import Loan from "../mir/Loan.js";

export default class ConstraintGenerator extends Pass {
    protected override _name: string = "constraint_generator";

    regionck: Regionck;
    constraints: OutlivesConstraint[];

    constructor(regionck: Regionck) {
        super();
        this.regionck = regionck;
        this.regionck.constraints = [];
        this.constraints = this.regionck.constraints;
    }

    override _apply_impl($jp: Joinpoint): PassResult {
        const universal = this.regionck.regions.filter(
            (r) => r.kind === RegionVariable.Kind.UNIVERSAL,
        );
        universal.forEach((region) => {
            region.points.add(`end(${region.name})`);
        });

        for (const node of this.regionck.cfg.graph.nodes()) {
            const scratch = node.scratch("_coral");

            // Insert CFG into universal regions
            for (const region of universal) {
                region.points.add(node.id());
            }

            // Lifetime constraints
            for (const variable of scratch.liveIn.keys()) {
                const ty = this.regionck.declarations.get(variable);
                if (ty === undefined) {
                    throw new Error(
                        `ConstraintGenerator: variable ${variable} not found in declarations`,
                    );
                }
                for (const region of ty.nestedLifetimes()) {
                    region.points.add(node.id());
                }
            }

            // Other constraints
            const successors = node
                .outgoers()
                .nodes()
                .map((e) => e.id());
            if (
                successors.length != 1 &&
                (scratch.loan || scratch.assignments?.length > 0)
            ) {
                throw new Error(
                    `ConstraintGenerator: node ${node.id()} has ${successors.length} successors and a loan/assignment`,
                );
            }

            this.#subtypingConstraints(node, successors[0]);
            this.#reborrowConstraints(node, successors[0]);
        }

        return new PassResult(this, $jp);
    }

    #reborrowConstraints(node: cytoscape.NodeSingular, successor: string) {
        const scratch = node.scratch("_coral");
        if (scratch.reborrow === undefined) {
            return;
        }

        if (scratch.loan === undefined) {
            throw new Error("reborrowConstraints: reborrow without loan");
        }

        for (const path of scratch.loan.loanedPath.supportingPrefixes()) {
            if (!(path instanceof PathDeref)) continue;

            this.#relateRegions(
                path.regionvar,
                (scratch.loan as Loan).regionVar,
                Variance.CONTRA,
                successor,
            );
        }
    }

    #subtypingConstraints(node: cytoscape.NodeSingular, successor: string) {
        // TODO: Missing constraints from parameters (maybe can be covered though assignment w/ proper annotations?)
        const scratch = node.scratch("_coral");

        if (scratch.loan) {
            this.#relateTy(
                scratch.loan.leftTy,
                scratch.loan.loanedRefTy,
                Variance.CO,
                successor,
            );
        } else {
            for (const assignment of scratch.assignments) {
                this.#relateTy(
                    assignment.leftTy,
                    assignment.rightTy,
                    Variance.CONTRA,
                    successor,
                );
            }
        }
    }

    #relateTy(ty1: Ty, ty2: Ty, variance: Variance, successor: string) {
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

        if (ty1 instanceof ElaboratedTy && ty2 instanceof ElaboratedTy) {
            if (ty1.name != ty2.name) {
                throw new Error(
                    `Cannot relate types ${ty1.toString()} and ${ty2.toString()}, different kinds or names`,
                );
            }
            if (ty1.lifetimes.length != ty2.lifetimes.length) {
                throw new Error(
                    `Cannot relate types ${ty1.toString()} and ${ty2.toString()}, different number of lifetimes`,
                );
            }

            for (let i = 0; i < ty1.lifetimes.length; i++) {
                // TODO: May need to be changed to go parameter by paramenter, which would require changes to the ElaboratedTy
                this.#relateRegions(
                    ty1.lifetimes[i],
                    ty2.lifetimes[i],
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
        successor: string,
    ) {
        switch (variance) {
            case Variance.CO: // "a Co b" == "a <= b"
                this.constraints.push(
                    new OutlivesConstraint(region2, region1, successor),
                );
                break;
            case Variance.CONTRA: // "a Contra b" == "a >= b"
                this.constraints.push(
                    new OutlivesConstraint(region1, region2, successor),
                );
                break;
            case Variance.IN: // "a In b" == "a == b"
                this.constraints.push(
                    new OutlivesConstraint(region2, region1, successor),
                );
                this.constraints.push(
                    new OutlivesConstraint(region1, region2, successor),
                );
                break;
        }
    }
}
import OutlivesConstraint from "@specs-feup/coral/regionck/OutlivesConstraint";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";
import Regionck from "@specs-feup/coral/regionck/Regionck";
import PathDeref from "@specs-feup/coral/mir/path/PathDeref";
import Ty from "@specs-feup/coral/mir/ty/Ty";
import RefTy from "@specs-feup/coral/mir/ty/RefTy";
import BuiltinTy from "@specs-feup/coral/mir/ty/BuiltinTy";
import StructTy from "@specs-feup/coral/mir/ty/StructTy";
import Variance from "@specs-feup/coral/mir/ty/Variance";
import BorrowKind from "@specs-feup/coral/mir/ty/BorrowKind";
import Loan from "@specs-feup/coral/mir/Loan";
import { GraphTransformation } from "clava-flow/graph/Graph";
import BaseGraph from "clava-flow/graph/BaseGraph";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import CoralNode from "@specs-feup/coral/graph/CoralNode";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";

export default class ConstraintGenerator implements GraphTransformation {
    #regionck?: Regionck;
    #debug: boolean;
    #targetFunction: FunctionEntryNode.Class;

    constructor(targetFunction: FunctionEntryNode.Class, debug: boolean = false) {
        this.#debug = debug;
        this.#targetFunction = targetFunction;
    }

    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("ConstraintGenerator can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        this.#regionck = coralGraph.getRegionck(this.#targetFunction);
        this.#processFunction(this.#targetFunction, coralGraph);

        if (this.#debug) {
            console.log(`Initial Constraint Set for ${this.#targetFunction.jp.name}:`);
            console.log(this.#regionck!.debugInfo());
        }

        this.#inferConstraints();

        if (this.#debug) {
            console.log(
                `Constraint Set for ${this.#targetFunction.jp.name} after inference:`,
            );
            console.log(this.#regionck!.debugInfo());
        }
    }

    #processFunction(
        functionEntry: FunctionEntryNode.Class,
        coralGraph: CoralGraph.Class,
    ) {
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
            for (const variable of coralNode.liveIn) {
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
            for (const loan of coralNode.loans) {
                const successor = this.#getSuccessor(coralNode);

                this.#subtypingConstraints(loan, successor, coralNode.jp);
                if (loan.reborrow) {
                    this.#reborrowConstraints(loan, successor, coralNode.jp);
                }
            }

            // Bounds for function calls
            for (const call of coralNode.fnCalls) {
                const successor = this.#getSuccessor(coralNode);
                const calleeNode = coralGraph.getFunction(call.$functionJp.name);

                let bounds: LifetimeBoundPragma[] | undefined;
                if (calleeNode === undefined) {
                    bounds = [];
                    const coralPragmas = CoralPragma.parse(call.$functionJp.pragmas);
                    const potentialBoundPragmas = coralPragmas.filter(
                        (p) =>
                            p.name === LifetimeBoundPragma.keyword &&
                            !p.tokens.some((token) => token === "="),
                    );
                    const lifetimeBoundPragmas =
                        LifetimeBoundPragma.parse(potentialBoundPragmas);
                    for (const lifetimeBoundPragma of lifetimeBoundPragmas) {
                        if (lifetimeBoundPragma.bound === undefined) {
                            continue;
                        }
                        bounds.push(lifetimeBoundPragma);
                    }
                } else {
                    const calleeRegionck = coralGraph.getRegionck(calleeNode);
                    bounds = calleeRegionck.bounds;
                }

                for (const bound of bounds) {
                    const sup = call.lifetimes.get(bound.name);
                    const sub = call.lifetimes.get(bound.bound!);
                    if (sup === undefined || sub === undefined) {
                        throw new Error(
                            `ConstraintGenerator: lifetime ${bound.name} or ${bound.bound} not found in call`,
                        );
                    }

                    this.#relateRegions(sub, sup, Variance.CO, successor, coralNode.jp);
                }
            }
        }
    }

    #getSuccessor(node: CoralNode.Class): CoralNode.Class {
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
        return successors[0].as(CoralNode.Class);
    }

    #subtypingConstraints(loan: Loan, successor: CoralNode.Class, $jp: Joinpoint) {
        this.#relateTy(loan.leftTy, loan.loanedRefTy, Variance.CO, successor, $jp);
    }

    #reborrowConstraints(loan: Loan, successor: CoralNode.Class, $jp: Joinpoint) {
        for (const path of loan.loanedPath.supportingPrefixes) {
            if (!(path instanceof PathDeref)) continue;

            this.#relateRegions(
                path.innerTy.regionVar,
                loan.regionVar,
                Variance.CONTRA,
                successor,
                $jp,
            );
        }
    }

    #relateTy(
        ty1: Ty,
        ty2: Ty,
        variance: Variance,
        successor: CoralNode.Class,
        $jp: Joinpoint,
    ) {
        if (ty1 instanceof RefTy && ty2 instanceof RefTy) {
            this.#relateRegions(
                ty1.regionVar,
                ty2.regionVar,
                Variance.xform(variance, Variance.CO),
                successor,
                $jp,
            );
            this.#relateTy(
                ty1.referent,
                ty2.referent,
                Variance.xform(
                    variance,
                    ty1.borrowKind == BorrowKind.MUTABLE ? Variance.IN : Variance.CO,
                ),
                successor,
                $jp,
            );
        } else if (ty1 instanceof StructTy && ty2 instanceof StructTy) {
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

            for (const [regionVarName, ty1RegionVar] of ty1.regionVarMap) {
                const ty2RegionVar = ty2.regionVarMap.get(regionVarName)!;
                this.#relateRegions(
                    ty1RegionVar,
                    ty2RegionVar,
                    Variance.xform(variance, Variance.IN),
                    successor,
                    $jp,
                );
            }
        } else if (!(ty1 instanceof BuiltinTy && ty2 instanceof BuiltinTy)) {
            throw new Error(
                `Cannot relate types ${ty1.toString()} and ${ty2.toString()}`,
            );
        }
    }

    #relateRegions(
        region1: RegionVariable,
        region2: RegionVariable,
        variance: Variance,
        successor: CoralNode.Class,
        $jp: Joinpoint,
    ) {
        switch (variance) {
            case Variance.CO: // "a Co b" == "a <= b"
                this.#regionck!.constraints.push(
                    new OutlivesConstraint(region2, region1, successor, $jp),
                );
                break;
            case Variance.CONTRA: // "a Contra b" == "a >= b"
                this.#regionck!.constraints.push(
                    new OutlivesConstraint(region1, region2, successor, $jp),
                );
                break;
            case Variance.IN: // "a In b" == "a == b"
                this.#regionck!.constraints.push(
                    new OutlivesConstraint(region2, region1, successor, $jp),
                );
                this.#regionck!.constraints.push(
                    new OutlivesConstraint(region1, region2, successor, $jp),
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

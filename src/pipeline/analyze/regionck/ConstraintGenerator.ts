import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";
import Loan from "@specs-feup/coral/mir/action/Loan";
import PathDeref from "@specs-feup/coral/mir/path/PathDeref";
import { Variance } from "@specs-feup/coral/mir/symbol/RegionConstraint";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import BuiltinTy from "@specs-feup/coral/mir/symbol/ty/BuiltinTy";
import RefTy from "@specs-feup/coral/mir/symbol/ty/RefTy";
import StructTy from "@specs-feup/coral/mir/symbol/ty/StructTy";

interface ConstraintGeneratorArgs {
    target: CoralFunctionNode.Class;
}

export default class ConstraintGenerator extends CoralTransformation<ConstraintGeneratorArgs> {
    applier = ConstraintGeneratorApplier;
}

class ConstraintGeneratorApplier extends CoralTransformationApplier<ConstraintGeneratorArgs> {
    apply(): void {
        this.#processFunction();

        if (this.graph.isDebug) {
            console.log(`Initial Constraint Set for ${this.args.target.jp.name}:`);
            console.log(this.debugInfo());
        }

        this.#inferConstraints();

        if (this.graph.isDebug) {
            console.log(
                `Constraint Set for ${this.args.target.jp.name} after inference:`,
            );
            console.log(this.debugInfo());
        }
    }

    #processFunction() {
        for (const region of this.args.target.universalRegionVars) {
            region.points.add(`end(${region.name})`);
        }

        const nodes = this.args.target.controlFlowNodes.expectAll(
            CoralCfgNode,
            "Nodes were previously inited as CoralCfgNode",
        );
        for (const node of nodes) {
            // Insert CFG into universal regions
            for (const region of this.args.target.universalRegionVars) {
                region.points.add(node.id);
            }

            // Lifetime constraints
            for (const variable of node.liveIn) {
                const ty = this.args.target.getSymbol(variable);
                if (ty === undefined) {
                    throw new Error(
                        `ConstraintGenerator: variable ${variable.name} not found in declarations`,
                    );
                }
                for (const region of ty.regionVars) {
                    region.points.add(node.id);
                }
            }

            for (const loan of node.loans) {
                const successor = this.#getSuccessor(node);

                this.#subtypingConstraints(loan, successor, node.jp);
                if (loan.isReborrow) {
                    this.#reborrowConstraints(loan, successor, node.jp);
                }
            }

            // Bounds for function calls
            for (const call of node.calls) {
                const successor = this.#getSuccessor(node);

                for (const bound of call.bounds) {
                    const sup = call.lifetimes.get(bound.name);
                    const sub = call.lifetimes.get(bound.bound!);
                    if (sup === undefined || sub === undefined) {
                        throw new Error(
                            `ConstraintGenerator: lifetime ${bound.name} or ${bound.bound} not found in call`,
                        );
                    }

                    this.args.target.addConstraint(
                        sub,
                        sup,
                        Variance.CO,
                        successor,
                        node.jp,
                    );
                }
            }
        }
    }

    #getSuccessor(node: CoralCfgNode.Class): CoralCfgNode.Class {
        const successors = node.outgoers.targets;
        if (successors.length != 1) {
            throw new Error(
                `ConstraintGenerator: node ${node.id} has ${successors.length} successors and a loan`,
            );
        }
        if (!successors[0].is(CoralCfgNode)) {
            throw new Error(
                `ConstraintGenerator: successor of node ${node.id} is not a CoralNode`,
            );
        }
        return successors[0].as(CoralCfgNode);
    }

    #subtypingConstraints(loan: Loan, successor: CoralCfgNode.Class, $jp: Joinpoint) {
        this.#relateTy(loan.leftTy, loan.loanedRefTy, Variance.CO, successor, $jp);
    }

    #reborrowConstraints(loan: Loan, successor: CoralCfgNode.Class, $jp: Joinpoint) {
        for (const path of loan.loanedPath.supportingPrefixes) {
            if (!(path instanceof PathDeref)) continue;

            this.args.target.addConstraint(
                path.#innerTy.regionVar,
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
        successor: CoralCfgNode.Class,
        $jp: Joinpoint,
    ) {
        if (ty1 instanceof RefTy && ty2 instanceof RefTy) {
            this.args.target.addConstraint(
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
                    ty1.loanKind == Loan.Kind.MUTABLE
                        ? Variance.IN
                        : Variance.CO,
                ),
                successor,
                $jp,
            );
        } else if (ty1 instanceof StructTy && ty2 instanceof StructTy) {
            if (ty1.jp.name != ty2.jp.name) {
                throw new Error(
                    `Cannot relate types ${ty1.toString()} and ${ty2.toString()}, different kinds or names`,
                );
            }
            if (ty1.regionVarMap.size != ty2.regionVarMap.size) {
                throw new Error(
                    `Cannot relate types ${ty1.toString()} and ${ty2.toString()}, different number of lifetimes`,
                );
            }

            for (const [regionVarName, ty1RegionVar] of ty1.regionVarMap) {
                const ty2RegionVar = ty2.regionVarMap.get(regionVarName)!;
                this.args.target.addConstraint(
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

    #inferConstraints() {
        let changed = true;
        while (changed) {
            changed = false;

            for (const constraint of this.args.target.regionConstraints) {
                changed ||= constraint.apply();
            }
        }
    }

    debugInfo(): string {
        let result = "\t| Regions:\n";
        for (const region of this.args.target.regions) {
            const points = Array.from(region.points).sort();
            result += `\t|\t${region.name}: {${points.join(", ")}}\n`;
        }

        result += "\t|\n\t| Constraints:\n";
        for (const constraint of this.args.target.regionConstraints) {
            result += `\t|\t${constraint.toString()}\n`;
        }

        return result + "\n";
    }
}

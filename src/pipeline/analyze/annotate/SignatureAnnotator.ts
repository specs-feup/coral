
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import ScopeNode from "@specs-feup/clava-flow/cfg/node/ScopeNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import Node from "@specs-feup/flow/graph/Node";

export default class SignatureAnnotator extends CoralTransformation {
    applier = SignatureAnnotatorApplier;
}

class SignatureAnnotatorApplier extends CoralTransformationApplier {
    apply(): void {
        for (const fn of this.graph.functionsToAnalyze) {
            const coralFn = fn
                .init(new CoralFunctionNode.Builder())
                .as(CoralFunctionNode);
            this.#annotateFunctionSignature(coralFn);
        }
    }

    #annotateFunctionSignature(fn: CoralFunctionNode.Class) {
        const coralPragmas = CoralPragma.parse(fn.jp.pragmas);

        // Static lifetime
        const staticRegionVar = this.#regionck!.newRegionVar(
            RegionVariable.Kind.UNIVERSAL,
            "%static",
        );

        // Lifetime Bounds
        const potentialBoundPragmas = coralPragmas.filter(
            (p) =>
                p.name === LifetimeBoundPragma.keyword &&
                !p.tokens.some((token) => token === "="),
        );
        const lifetimeBoundPragmas = LifetimeBoundPragma.parse(potentialBoundPragmas);
        for (const lifetimeBoundPragma of lifetimeBoundPragmas) {
            if (lifetimeBoundPragma.bound === undefined) {
                continue;
            }
            this.#regionck!.bounds.push(lifetimeBoundPragma);
        }

        // Lifetime assignments
        const potentialAssignmentPragmas = coralPragmas.filter(
            (p) =>
                p.name === LifetimeAssignmentPragma.keyword &&
                p.tokens.some((token) => token === "="),
        );
        const lifetimeAssignmentPragmas = LifetimeAssignmentPragma.parse(
            potentialAssignmentPragmas,
        );
        let lifetimeAssignments = new Map<
            string,
            [LfPath, RegionVariable, LifetimeAssignmentPragma][]
        >();
        let lifetimes = new Map<string, RegionVariable>();
        lifetimes.set("%static", staticRegionVar);
        for (const lifetimeAssignmentPragma of lifetimeAssignmentPragmas) {
            const lfPath = lifetimeAssignmentPragma.lhs;
            let regionVar = lifetimes.get(lifetimeAssignmentPragma.rhs);
            if (regionVar === undefined) {
                regionVar = this.#regionck!.newRegionVar(
                    RegionVariable.Kind.UNIVERSAL,
                    lifetimeAssignmentPragma.rhs,
                );
                lifetimes.set(lifetimeAssignmentPragma.rhs, regionVar);
            }

            if (lifetimeAssignments.has(lfPath.varName)) {
                lifetimeAssignments
                    .get(lfPath.varName)!
                    .push([lfPath, regionVar, lifetimeAssignmentPragma]);
            } else {
                lifetimeAssignments.set(lfPath.varName, [
                    [lfPath, regionVar, lifetimeAssignmentPragma],
                ]);
            }
        }

        // Inference is only done if there are explicit no pragmas
        if (lifetimeAssignmentPragmas.length === 0 && lifetimeBoundPragmas.length === 0) {
            this.#regionck!.inferLifetimeBoundsState =
                InferLifetimeBounds.FunctionState.NOT_VISITED;
        }

        const takenLifetimeNames = new Set(lifetimes.keys());

        // Return type
        const returnTy = this.#parseType(
            $jp.returnType,
            lifetimeAssignments.get("return"),
            RegionVariable.Kind.UNIVERSAL,
            takenLifetimeNames,
            "return",
        );
        this.#regionck!.registerReturnTy(returnTy);

        // Params
        for (const $param of $jp.params) {
            const ty = this.#parseType(
                $param.type,
                lifetimeAssignments.get($param.name),
                RegionVariable.Kind.UNIVERSAL,
                takenLifetimeNames,
                $param.name,
            );
            this.#regionck!.registerTy($param, ty);
        }
    }
}

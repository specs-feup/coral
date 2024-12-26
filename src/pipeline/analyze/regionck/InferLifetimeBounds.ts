import { Call, FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralTransformation, {
    CoralTransformationApplier,
} from "@specs-feup/coral/graph/CoralTransformation";
import Region from "@specs-feup/coral/mir/symbol/Region";
import ConstraintGenerator from "@specs-feup/coral/pipeline/analyze/regionck/ConstraintGenerator";
import InScopeLoansComputation from "@specs-feup/coral/pipeline/analyze/regionck/InScopeLoansComputation";
import RegionckErrorReporting from "@specs-feup/coral/pipeline/analyze/regionck/RegionckErrorReporting";
import FunctionNode from "@specs-feup/flow/flow/FunctionNode";
import Query from "@specs-feup/lara/api/weaver/Query.js";

interface InferLifetimeBoundsArgs {
    iterationLimit?: number;
}

class InferLifetimeBounds extends CoralTransformation<InferLifetimeBoundsArgs> {
    applier = InferLifetimeBoundsApplier;
}

class InferLifetimeBoundsApplier extends CoralTransformationApplier<InferLifetimeBoundsArgs> {
    apply(): void {
        let state = InferLifetimeBounds.State.PRIORITIZE_LEAFS;
        let changed;
        let iterationNumber = 0;
        while (
            this.args.iterationLimit === undefined ||
            iterationNumber < this.args.iterationLimit
        ) {
            changed = false;

            for (const fn of this.graph.functionsToAnalyze) {
                if (this.graph.isDebug) {
                    console.log("Inferring lifetimes of function", fn.jp.name);
                }

                if (
                    fn.inferRegionBoundsState !==
                    InferLifetimeBounds.FunctionState.NOT_VISITED
                ) {
                    continue;
                }

                if (
                    state === InferLifetimeBounds.State.PRIORITIZE_LEAFS &&
                    this.#hasUnvisitedCall(fn)
                ) {
                    continue;
                }

                fn.inferRegionBoundsState =
                    InferLifetimeBounds.FunctionState.VISITED;

                this.graph
                    .apply(new ConstraintGenerator({ target: fn }))
                    .apply(new InScopeLoansComputation({ target: fn }))
                    .apply(new RegionckErrorReporting({ target: fn }));

                const thisChanged = this.#addMissingUniversalRegions(fn);
                changed ||= thisChanged;

                if (thisChanged) {
                    this.#propagateUnvisited(fn.jp.calls);
                }

                fn.resetRegionck();
            }

            if (changed) {
                if (state !== InferLifetimeBounds.State.PRIORITIZE_LEAFS) {
                    state = InferLifetimeBounds.State.PRIORITIZE_LEAFS;
                    iterationNumber++;
                }
            } else {
                if (state === InferLifetimeBounds.State.PRIORITIZE_LEAFS) {
                    state = InferLifetimeBounds.State.ALLOW_LOOPS;
                } else {
                    break;
                }
            }
        }
    }

    #hasUnvisitedCall(fn: CoralFunctionNode.Class): boolean {
        // TODO I think this doesn't support nested functions (which are nonstandard anyway)
        for (const call of Query.searchFrom(fn.jp, Call)) {
            const calleeNode = this.graph.getFunction(call.function);
            if (calleeNode === undefined) {
                continue;
            }
            if (
                fn.inferRegionBoundsState !==
                InferLifetimeBounds.FunctionState.NOT_VISITED
            ) {
                continue;
            }

            return true;
        }

        return false;
    }

    #addMissingUniversalRegions(fn: CoralFunctionNode.Class): boolean {
        let changed = false;

        for (const region of fn.universalRegions) {
            for (const bound of region.missingBounds(fn.bounds)) {
                changed = true;
                // TODO generate this code
                // const pragma = new Pragma(`#pragma coral lf ${region.name}: ${end}`);
                // $fn.insertBefore(pragma);
                fn.addBound(bound);
            }
        }

        return changed;
    }

    #propagateUnvisited(calls: Call[]) {
        for (const $call of calls) {
            const callerNode = this.graph
                .getFunction($call.function)
                ?.tryAs(CoralFunctionNode);
            if (callerNode === undefined) {
                continue;
            }

            if (
                callerNode.inferRegionBoundsState ===
                InferLifetimeBounds.FunctionState.VISITED
            ) {
                callerNode.inferRegionBoundsState =
                    InferLifetimeBounds.FunctionState.NOT_VISITED;
            }
        }
    }
}

namespace InferLifetimeBounds {
    export enum State {
        PRIORITIZE_LEAFS,
        ALLOW_LOOPS,
    }

    export enum FunctionState {
        NOT_VISITED,
        VISITED,
        IGNORE,
    }
}

export default InferLifetimeBounds;

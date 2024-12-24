import { Call, FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralTransformation, {
    CoralTransformationApplier,
} from "@specs-feup/coral/graph/CoralTransformation";
import ConstraintGenerator from "@specs-feup/coral/pipeline/analyze/regionck/ConstraintGenerator";
import InScopeLoansComputation from "@specs-feup/coral/pipeline/analyze/regionck/InScopeLoansComputation";
import RegionckErrorReporting from "@specs-feup/coral/pipeline/analyze/regionck/RegionckErrorReporting";
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

                const thisChanged = this.#addMissingUniversalRegions(fn.jp);
                changed ||= thisChanged;

                if (thisChanged) {
                    this.#propagateUnvisited(fn.jp.calls);
                }

                regionck.reset();
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

    #addMissingUniversalRegions($fn: FunctionJp): boolean {
        let changed = false;
        for (const region of regionck.universalRegionVars) {
            if (!isNaN(Number(region.name.slice(1)))) {
                continue;
            }

            const ends = Array.from(region.points)
                .filter((point) => point.startsWith("end("))
                .map((point) => point.slice(4, -1));

            for (const end of ends) {
                if (region.name === end) {
                    continue;
                }

                const hasBound = regionck.bounds.some(
                    (b) => b.name === region.name && b.bound === end,
                );

                if (!hasBound) {
                    changed = true;
                    // TODO generate this code
                    // const pragma = new Pragma(`#pragma coral lf ${region.name}: ${end}`);
                    // $fn.insertBefore(pragma);
                    regionck.bounds.push(
                        LifetimeBoundPragma.parse(
                            CoralPragma.parse([$fn.pragmas[$fn.pragmas.length - 1]]),
                        )[0],
                    );
                }
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

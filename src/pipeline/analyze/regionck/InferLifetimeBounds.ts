import { Call, FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";
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

            for (const functionEntry of this.graph.functionsToAnalyze) {
                if (this.graph.isDebug) {
                    console.log("Inferring lifetimes of function", functionEntry.jp.name);
                }

                if (
                    regionck.inferLifetimeBoundsState !==
                    InferLifetimeBounds.FunctionState.NOT_VISITED
                ) {
                    continue;
                }

                if (
                    state === InferLifetimeBounds.State.PRIORITIZE_LEAFS &&
                    this.#hasUnvisitedCall(functionEntry)
                ) {
                    continue;
                }

                regionck.inferLifetimeBoundsState =
                    InferLifetimeBounds.FunctionState.VISITED;

                this.graph
                    .apply(new ConstraintGenerator({ target: functionEntry }))
                    .apply(new InScopeLoansComputation({ target: functionEntry }))
                    .apply(new RegionckErrorReporting({ target: functionEntry }));

                const thisChanged = this.#addMissingUniversalRegions(functionEntry.jp);
                changed ||= thisChanged;

                if (thisChanged) {
                    this.#propagateUnvisited(functionEntry.jp.calls);
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

    #hasUnvisitedCall(functionEntry: CoralFunctionNode.Class): boolean {
        // TODO I think this doesn't support nested functions
        for (const call of Query.searchFrom(functionEntry.jp, Call)) {
            const calleeNode = this.graph.getFunction(call.function);
            if (calleeNode === undefined) {
                continue;
            }
            if (
                calleeRegionck.inferLifetimeBoundsState !==
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
            const callerNode = coralGraph.getFunction($call.function.name);
            if (callerNode === undefined) {
                continue;
            }

            if (
                callerRegionck.inferLifetimeBoundsState ===
                InferLifetimeBounds.FunctionState.VISITED
            ) {
                callerRegionck.inferLifetimeBoundsState =
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

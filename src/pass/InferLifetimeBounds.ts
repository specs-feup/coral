
import { GraphTransformation } from "clava-flow/graph/Graph";
import CoralGraph from "coral/graph/CoralGraph";
import BaseGraph from "clava-flow/graph/BaseGraph";
import ConstraintGenerator from "coral/pass/ConstraintGenerator";
import InScopeLoansComputation from "coral/pass/InScopeLoansComputation";
import RegionckErrorReporting from "coral/pass/RegionckErrorReporting";
import Query from "lara-js/api/weaver/Query.js";
import { Call, FunctionJp, Pragma } from "clava-js/api/Joinpoints.js";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import Regionck from "coral/regionck/Regionck";
import CoralPragma from "coral/pragma/CoralPragma";
import LifetimeBoundPragma from "coral/pragma/lifetime/LifetimeBoundPragma";

class InferLifetimeBounds implements GraphTransformation {
    #inferFunctionLifetimes: boolean;
    #iterationLimit?: number;

    constructor(inferFunctionLifetimes = true, iterationLimit?: number) {
        this.#inferFunctionLifetimes = inferFunctionLifetimes;
        this.#iterationLimit = iterationLimit;
    }

    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("InferLifetimeBounds can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        if (this.#inferFunctionLifetimes) {
            this.#inferLifetimes(coralGraph);
        }
    }

    #inferLifetimes(coralGraph: CoralGraph.Class) {
        let state = InferLifetimeBounds.State.PRIORITIZE_LEAFS;
        let changed;
        let iterationNumber = 0;
        while (this.#iterationLimit === undefined || iterationNumber < this.#iterationLimit) {
            changed = false;

            for (const functionEntry of coralGraph.functions) {
                console.log("Inferring lifetimes of function", functionEntry.jp.name);
                const regionck = coralGraph.getRegionck(functionEntry);

                if (
                    regionck.inferLifetimeBoundsState !==
                    InferLifetimeBounds.FunctionState.NOT_VISITED
                ) {
                    continue;
                }

                if (
                    state === InferLifetimeBounds.State.PRIORITIZE_LEAFS &&
                    this.#hasUnvisitedCall(coralGraph, functionEntry)
                ) {
                    continue;
                }

                regionck.inferLifetimeBoundsState =
                    InferLifetimeBounds.FunctionState.VISITED;

                coralGraph
                    .apply(new ConstraintGenerator(functionEntry))
                    .apply(new InScopeLoansComputation(functionEntry))
                    .apply(new RegionckErrorReporting(false));

                const thisChanged = this.#addMissingUniversalRegions(
                    functionEntry.jp,
                    regionck,
                );
                changed ||= thisChanged;

                if (thisChanged) {
                    this.#propagateUnvisited(coralGraph, functionEntry.jp.calls);
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

    #hasUnvisitedCall(
        coralGraph: CoralGraph.Class,
        functionEntry: FunctionEntryNode.Class,
    ): boolean {
        const calls = Query.searchFrom(functionEntry.jp, "call").get() as Call[];
        for (const call of calls) {
            const calleeNode = coralGraph.getFunction(call.name);
            if (calleeNode === undefined) {
                continue;
            }
            const calleeRegionck = coralGraph.getRegionck(calleeNode);
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

    #addMissingUniversalRegions($fn: FunctionJp, regionck: Regionck): boolean {
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
                    const pragma = new Pragma(`#pragma coral lf ${region.name}: ${end}`);
                    $fn.insertBefore(pragma);
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

    #propagateUnvisited(coralGraph: CoralGraph.Class, calls: Call[]) {
        for (const $call of calls) {
            const callerNode = coralGraph.getFunction($call.function.name);
            if (callerNode === undefined) {
                continue;
            }

            const callerRegionck = coralGraph.getRegionck(callerNode);
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
        IGNORE
    }
}

export default InferLifetimeBounds;

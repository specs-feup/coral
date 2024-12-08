import ClavaFlowGraph from "@specs-feup/clava-flow/ClavaFlowGraph";
import { CoralConfig } from "@specs-feup/coral/Coral";
import Graph from "@specs-feup/flow/graph/Graph";

namespace CoralGraph {
    export const TAG = "__coral__coral_graph";
    export const VERSION = "1";

    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends ClavaFlowGraph.Class<D, S> {
        // getRegionck(functionEntry: FunctionEntryNode.Class): Regionck {
        //     let regionck = this.scratchData.coral.functions.get(functionEntry.jp.name);

        //     let $file: Joinpoint = functionEntry.jp;
        //     while (!($file instanceof FileJp)) {
        //         $file = $file.parent;
        //     }

        //     if (regionck === undefined) {
        //         regionck = new Regionck(functionEntry, this.getStructDefsMap($file));
        //         this.scratchData.coral.functions.set(functionEntry.jp.name, regionck);
        //     }
        //     return regionck;
        // }

        // getStructDefsMap(file: FileJp): StructDefsMap {
        //     let structDefs = this.scratchData.coral.files.get(file.astId);
        //     if (structDefs === undefined) {
        //         structDefs = new StructDefsMap(file);
        //         this.scratchData.coral.files.set(file.astId, structDefs);
        //     }
        //     return structDefs;
        // }
    }

    export class Builder
        implements Graph.Builder<Data, ScratchData, ClavaFlowGraph.Data, ClavaFlowGraph.ScratchData>
    {
        #config: CoralConfig;

        constructor(config: CoralConfig) {
            this.#config = config;
        }

        buildData(data: ClavaFlowGraph.Data): Data {
            return {
                ...data,
                [TAG]: {
                    version: VERSION,
                    config: this.#config,
                },
            };
        }

        buildScratchData(scratchData: ClavaFlowGraph.ScratchData): ScratchData {
            return scratchData;

            // return {
            //     ...scratchData,
            //     ...super.buildScratchData(scratchData),
            //     coral: {
            //         functions: new Map<string, Regionck>(),
            //         files: new Map<string, StructDefsMap>(),
            //     },
            // };
        }
    }

    export const TypeGuard = Graph.TagTypeGuard<Data, ScratchData>(
        TAG,
        VERSION,
        (sData) => {
            const sd = sData as ClavaFlowGraph.ScratchData;
            return typeof sd[ClavaFlowGraph.TAG] === "object" && typeof sd[ClavaFlowGraph.TAG].jpToNodeMap === "object";
            // TODO add more tests ?
        },
    );

    export interface Data extends ClavaFlowGraph.Data {
        [TAG]: {
            version: typeof VERSION;
            config: CoralConfig;
        };
    }

    export interface ScratchData extends ClavaFlowGraph.ScratchData {
        // [TAG]: {
        //     // functions: Map<string, Regionck>;
        //     // files: Map<string, StructDefsMap>;
        // };
    }
}

export default CoralGraph;

import ClavaFlowGraph from "@specs-feup/clava-flow/ClavaFlowGraph";
import {
    FileJp,
    FunctionJp,
} from "@specs-feup/clava/api/Joinpoints.js";
import { CoralConfig } from "@specs-feup/coral/Coral";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import FileSymbolTable from "@specs-feup/coral/symbol/FileSymbolTable";
import Graph from "@specs-feup/flow/graph/Graph";
import { NodeCollection } from "@specs-feup/flow/graph/NodeCollection";

namespace CoralGraph {
    export const TAG = "__coral__coral_graph";
    export const VERSION = "1";

    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends ClavaFlowGraph.Class<D, S> {
        get functionsToAnalyze(): NodeCollection<CoralFunctionNode.Class> {
            const fns = this.clavaFunctions.filter((fn) =>
                this.data[TAG].functionsToAnalyze.includes(fn.jp.name),
            );
            for (const fn of fns) {
                if (fn.is(CoralFunctionNode)) {
                    continue;
                }
                const symbolTable = this.#getFileSymbolTable(
                    fn.jp.getAncestor("file") as FileJp,
                );
                fn.init(new CoralFunctionNode.Builder(symbolTable));
            }

            return fns.expectAll(CoralFunctionNode, "All elements were just initialized");
        }

        #getFileSymbolTable(file: FileJp): FileSymbolTable {
            let fileSymbolTable = this.scratchData[TAG].symbolTable.get(file.astId);
            if (fileSymbolTable === undefined) {
                fileSymbolTable = new FileSymbolTable();
                this.scratchData[TAG].symbolTable.set(file.astId, fileSymbolTable);
            }
            return fileSymbolTable;
        }

        get isDebug(): boolean {
            return this.data[TAG].config.debug;
        }
    }

    export class Builder
        implements
            Graph.Builder<
                Data,
                ScratchData,
                ClavaFlowGraph.Data,
                ClavaFlowGraph.ScratchData
            >
    {
        #config: CoralConfig;
        #functionsToAnalyze: string[];

        constructor(config: CoralConfig, functionsToAnalyze: FunctionJp[]) {
            this.#config = config;
            this.#functionsToAnalyze = functionsToAnalyze.map((fn) => fn.signature);
        }

        buildData(data: ClavaFlowGraph.Data): Data {
            return {
                ...data,
                [TAG]: {
                    version: VERSION,
                    config: this.#config,
                    functionsToAnalyze: this.#functionsToAnalyze,
                },
            };
        }

        buildScratchData(scratchData: ClavaFlowGraph.ScratchData): ScratchData {
            return {
                ...scratchData,
                [TAG]: {
                    symbolTable: new Map(),
                },
            };
        }
    }

    export const TypeGuard = Graph.TagTypeGuard<Data, ScratchData>(
        TAG,
        VERSION,
        (sData) => {
            const sd = sData as ClavaFlowGraph.ScratchData;
            return (
                typeof sd[ClavaFlowGraph.TAG] === "object" &&
                typeof sd[ClavaFlowGraph.TAG].jpToNodeMap === "object"
            );
            // TODO add more tests ?
        },
    );

    export interface Data extends ClavaFlowGraph.Data {
        [TAG]: {
            version: typeof VERSION;
            config: CoralConfig;
            functionsToAnalyze: string[];
        };
    }

    export interface ScratchData extends ClavaFlowGraph.ScratchData {
        [TAG]: {
            symbolTable: Map<string, FileSymbolTable>;
        };
    }
}

export default CoralGraph;

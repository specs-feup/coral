import ClavaFlowGraph from "@specs-feup/clava-flow/ClavaFlowGraph";
import ClavaFunctionNode from "@specs-feup/clava-flow/ClavaFunctionNode";
import { FunctionJp, RecordJp, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import { CoralConfig } from "@specs-feup/coral/Coral";
import Def from "@specs-feup/coral/mir/symbol/Def";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
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
        get functionsToAnalyze(): NodeCollection<ClavaFunctionNode.Class> {
            return this.clavaFunctions.filter(fn => this.data[TAG].functionsToAnalyze.includes(fn.jp.name));
        }

        getSymbol($decl: Vardecl): Ty;
        getSymbol($decl: RecordJp): Def;
        getSymbol($decl: Vardecl | RecordJp): Ty | Def {
            const symbolTable = this.scratchData[TAG].symbolTable;
            let fileSymbolTable = symbolTable.get($decl.getAncestor("file").astId);
            if (fileSymbolTable === undefined) {
                fileSymbolTable = new FileSymbolTable();
                symbolTable.set($decl.filepath, fileSymbolTable);
            }
            return fileSymbolTable.get($decl);
        }

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
        #functionsToAnalyze: string[];

        constructor(config: CoralConfig, functionsToAnalyze: FunctionJp[]) {
            this.#config = config;
            this.#functionsToAnalyze = functionsToAnalyze.map(fn => fn.signature);
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
            return typeof sd[ClavaFlowGraph.TAG] === "object" && typeof sd[ClavaFlowGraph.TAG].jpToNodeMap === "object";
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

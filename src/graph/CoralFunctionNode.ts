import ClavaFunctionNode from "@specs-feup/clava-flow/ClavaFunctionNode";
import { FunctionJp, RecordJp, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Def from "@specs-feup/coral/mir/symbol/Def";
import Fn from "@specs-feup/coral/mir/symbol/Fn";
import Region from "@specs-feup/coral/mir/symbol/Region";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import FileSymbolTable from "@specs-feup/coral/symbol/FileSymbolTable";
import FunctionSymbolTable from "@specs-feup/coral/symbol/FunctionSymbolTable";
import Node from "@specs-feup/flow/graph/Node";

namespace CoralFunctionNode {
    export const TAG = "__coral__coral_function_node";
    export const VERSION = "1";

    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends ClavaFunctionNode.Class<D, S> {
        getSymbol($decl: Vardecl): Ty;
        getSymbol($decl: RecordJp): Def;
        getSymbol($decl: FunctionJp): Fn;
        getSymbol($decl: Vardecl | RecordJp | FunctionJp): Ty | Def | Fn {
            return this.scratchData[TAG].symbolTable.get($decl);
        }

        generateRegion(kind: Region.Kind) {
            return this.scratchData[TAG].symbolTable.generateRegion(kind);
        }

        get staticRegion(): Region {
            return this.scratchData[TAG].symbolTable.staticRegion;
        }

        get regions(): Iterable<Region> {
            return this.scratchData[TAG].symbolTable.regions;
        }
    }

    export class Builder
        implements
            Node.Builder<
                Data,
                ScratchData,
                ClavaFunctionNode.Data,
                ClavaFunctionNode.ScratchData
            >
    {
        #fileTable: FileSymbolTable;
        constructor(fileTable: FileSymbolTable) {
            this.#fileTable = fileTable;
        }

        buildData(data: ClavaFunctionNode.Data): Data {
            return {
                ...data,
                [TAG]: {
                    version: VERSION,
                    
                },
            };
        }

        buildScratchData(scratchData: ClavaFunctionNode.ScratchData): ScratchData {
            return {
                ...scratchData,
                [TAG]: {
                    symbolTable: new FunctionSymbolTable(this.#fileTable),
                },
            };
        }
    }

    export const TypeGuard = Node.TagTypeGuard<Data, ScratchData>(
        TAG,
        VERSION,
        (sData) => {
            const sd = sData as CoralFunctionNode.ScratchData;
            return (
                ClavaFunctionNode.TypeGuard.isScratchDataCompatible(sData)
            );
            // TODO add more tests ?
        },
    );

    export interface Data extends ClavaFunctionNode.Data {
        [TAG]: {
            version: typeof VERSION;
            
        };
    }

    export interface ScratchData extends ClavaFunctionNode.ScratchData {
        [TAG]: {
            symbolTable: FunctionSymbolTable;
        };
    }
}

export default CoralFunctionNode;

import FlowGraph from "clava-flow/flow/FlowGraph";
import FlowGraphGenerator from "clava-flow/flow/FlowGraphGenerator";
import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import FlowNode from "clava-flow/flow/node/FlowNode";
import ConditionNode from "clava-flow/flow/node/condition/ConditionNode";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import FunctionExitNode from "clava-flow/flow/node/instruction/FunctionExitNode";
import InstructionNode from "clava-flow/flow/node/instruction/InstructionNode";
import ScopeEndNode from "clava-flow/flow/node/instruction/ScopeEndNode";
import ScopeStartNode from "clava-flow/flow/node/instruction/ScopeStartNode";
import VarDeclarationNode from "clava-flow/flow/node/instruction/VarDeclarationNode";
import BaseGraph from "clava-flow/graph/BaseGraph";
import Graph, { GraphBuilder, GraphTypeGuard } from "clava-flow/graph/Graph";
import { FileJp, Joinpoint } from "clava-js/api/Joinpoints.js";
import Regionck from "coral/regionck/Regionck";
import StructDefsMap from "coral/regionck/StructDefsMap";


namespace CoralGraph {
    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends FlowGraph.Class<D, S> {
        getRegionck(functionEntry: FunctionEntryNode.Class): Regionck {
            let regionck = this.scratchData.coral.functions.get(functionEntry.jp.name);

            let $file: Joinpoint = functionEntry.jp;
            while (!($file instanceof FileJp)) {
                $file = $file.parent;
            }

            if (regionck === undefined) {
                regionck = new Regionck(functionEntry, this.getStructDefsMap($file));
                this.scratchData.coral.functions.set(functionEntry.jp.name, regionck);
            }
            return regionck;
        }

        getStructDefsMap(file: FileJp): StructDefsMap {
            let structDefs = this.scratchData.coral.files.get(file.astId);
            if (structDefs === undefined) {
                structDefs = new StructDefsMap(file);
                this.scratchData.coral.files.set(file.astId, structDefs);
            }
            return structDefs;
        }
    }

    export class Builder
        extends BaseGraph.Builder
        implements GraphBuilder<Data, ScratchData>
    {
        override buildData(data: BaseGraph.Data): Data {
            if (!FlowGraph.TypeGuard.isDataCompatible(data)) {
                throw new Error("CoralGraph must have FlowGraph data to be initialized.");
            }

            return {
                ...data,
                ...super.buildData(data),
            };
        }

        override buildScratchData(scratchData: BaseGraph.ScratchData): ScratchData {
            if (!FlowGraph.TypeGuard.isScratchDataCompatible(scratchData)) {
                throw new Error("CoralGraph must have FlowGraph data to be initialized.");
            }

            return {
                ...scratchData,
                ...super.buildScratchData(scratchData),
                coral: {
                    functions: new Map<string, Regionck>(),
                    files: new Map<string, StructDefsMap>(),
                },
            };
        }
    }

    export const TypeGuard: GraphTypeGuard<Data, ScratchData> = {
        isDataCompatible(data: BaseGraph.Data): data is Data {
            if (!FlowGraph.TypeGuard.isDataCompatible(data)) return false;
            return true;
        },

        isScratchDataCompatible(sData: BaseGraph.ScratchData): sData is ScratchData {
            if (!FlowGraph.TypeGuard.isScratchDataCompatible(sData)) return false;
            const data = sData as ScratchData;
            if (data.coral === undefined) return false;
            return true;
        },
    };

    export interface Data extends FlowGraph.Data { }

    export interface ScratchData extends FlowGraph.ScratchData {
        coral: {
            functions: Map<string, Regionck>;
            files: Map<string, StructDefsMap>;
        };
    }
}

export default CoralGraph;

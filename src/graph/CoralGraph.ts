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
import Regionck from "coral/regionck/Regionck";


namespace CoralGraph {
    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends FlowGraph.Class<D, S> {
        getRegionck(functionEntry: FunctionEntryNode.Class): Regionck {
            let regionck = this.scratchData.coral.functions.get(functionEntry.jp.name);
            if (regionck === undefined) {
                regionck = new Regionck(functionEntry);
                this.scratchData.coral.functions.set(functionEntry.jp.name, regionck);
            }
            return regionck;
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
            return true;
        },
    };

    export interface Data extends FlowGraph.Data { }

    export interface ScratchData extends FlowGraph.ScratchData {
        coral: {
            functions: Map<string, Regionck>;
        };
    }
}

export default CoralGraph;

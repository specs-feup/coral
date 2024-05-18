import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import FlowNode from "clava-flow/flow/node/FlowNode";
import InstructionNode from "clava-flow/flow/node/instruction/InstructionNode";
import LivenessNode from "clava-flow/flow/transformation/liveness/LivenessNode";
import BaseNode from "clava-flow/graph/BaseNode";
import { NodeBuilder, NodeTypeGuard } from "clava-flow/graph/Node";
import { Joinpoint, Vardecl } from "clava-js/api/Joinpoints.js";
import CoralNode from "coral/graph/CoralNode";
import Access from "coral/mir/Access";
import FunctionCall from "coral/mir/FunctionCall";
import Loan from "coral/mir/Loan";
import MoveTable from "coral/mir/MoveTable";

namespace DropNode {
    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends CoralNode.Class<D, S> {
        get dropIsConditional(): boolean {
            return this.data.coral.dropIsConditional;
        }

        get dropInsertLocation(): DropInsertLocation {
            return this.data.coral.dropInsertLocation;
        }
    }

    export class Builder
        extends CoralNode.Builder
        implements NodeBuilder<Data, ScratchData>
    {
        #isConditional: boolean;
        #insertLocation: DropInsertLocation;

        constructor(isConditional: boolean, insertLocation: DropInsertLocation) {
            super();
            this.#isConditional = isConditional;
            this.#insertLocation = insertLocation;
        }

        override buildData(data: BaseNode.Data): Data {
            return {
                ...super.buildData(data),
                coral: {
                    dropIsConditional: this.#isConditional,
                    dropInsertLocation: this.#insertLocation,
                }
            };
        }

        override buildScratchData(scratchData: BaseNode.ScratchData): ScratchData {
            return {
                ...super.buildScratchData(scratchData),
            };
        }
    }

    export const TypeGuard: NodeTypeGuard<Data, ScratchData> = {
        isDataCompatible(data: BaseNode.Data): data is Data {
            if (!CoralNode.TypeGuard.isDataCompatible(data)) return false;
            const sData = data as Data;
            if (sData.coral === undefined) return false;
            if (!(sData.coral.dropIsConditional === true || sData.coral.dropIsConditional === false)) return false;
            if (!(sData.coral.dropInsertLocation === DropInsertLocation.BEFORE_TARGET || sData.coral.dropInsertLocation === DropInsertLocation.AFTER_TARGET)) return false;
            return true;
        },

        isScratchDataCompatible(
            scratchData: BaseNode.ScratchData,
        ): scratchData is ScratchData {
            if (!CoralNode.TypeGuard.isScratchDataCompatible(scratchData)) return false;
            return true;
        },
    };

    export interface Data extends CoralNode.Data {
        coral: {
            dropIsConditional: boolean;
            dropInsertLocation: DropInsertLocation;
        }
    }

    export interface ScratchData extends CoralNode.ScratchData { }
    
    // ------------------------------

    export enum DropInsertLocation {
        BEFORE_TARGET = "before",
        AFTER_TARGET = "after",
    }
}

export default DropNode;

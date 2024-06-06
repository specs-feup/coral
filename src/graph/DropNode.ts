import FlowNode from "clava-flow/flow/node/FlowNode";
import BaseNode from "clava-flow/graph/BaseNode";
import { NodeBuilder, NodeTypeGuard } from "clava-flow/graph/Node";
import CoralNode from "coral/graph/CoralNode";

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

        get elaborated(): boolean {
            return this.data.coral.elaborated;
        }

        insertDropCallBefore($call: string): void {
            let targetNode: FlowNode.Class = this;
            while (
                targetNode.is(DropNode.TypeGuard) &&
                !targetNode.as(DropNode.Class).elaborated
            ) {
                const nextNodes = targetNode.nextNodes;
                if (nextNodes.length !== 1) {
                    throw new Error(
                        "Drop nodes with insertBefore must have exactly one successor",
                    );
                }
                targetNode = nextNodes[0];
            }
            if (targetNode.jp === undefined) {
                throw new Error("Target node must have a joinpoint");
            }
            this.scratchData.$jp = targetNode.jp.insertBefore($call);
            this.data.coral.elaborated = true;
        }

        insertDropCallAfter($call: string): void {
            let targetNode: FlowNode.Class = this;
            while (
                targetNode.is(DropNode.TypeGuard) &&
                !targetNode.as(DropNode.Class).elaborated
            ) {
                const previousNodes = targetNode.previousNodes;
                if (previousNodes.length !== 1) {
                    throw new Error(
                        "Drop nodes with insertAfter must have exactly one predecessor",
                    );
                }
                targetNode = previousNodes[0];
            }
            if (targetNode.jp === undefined) {
                throw new Error("Target node must have a joinpoint");
            }
            
            this.scratchData.$jp = targetNode.jp.insertAfter($call);
            this.data.coral.elaborated = true;
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
                    elaborated: false,
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
            elaborated: boolean;
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

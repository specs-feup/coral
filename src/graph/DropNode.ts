import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import Node from "@specs-feup/flow/graph/Node";

namespace DropNode {
    export const TAG = "__coral__drop_node";
    export const VERSION = "1";

    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends CoralCfgNode.Class<D, S> {
        get isDropConditional(): boolean {
            return this.data[TAG].isDropConditional;
        }

        get isDropElaborated(): boolean {
            return this.data[TAG].isDropElaborated;
        }

        get dropInsertLocation(): InsertLocation {
            return this.data[TAG].dropInsertLocation;
        }

        insertDropCallBefore($call: string): void {
            let targetNode: FlowNode.Class = this;
            while (targetNode.tryAs(DropNode)?.isDropElaborated) {
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
            this.data[TAG].isDropElaborated = true;
        }

        insertDropCallAfter($call: string): void {
            let targetNode: FlowNode.Class = this;
            while (targetNode.tryAs(DropNode)?.isDropElaborated) {
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
            this.data[TAG].isDropElaborated = true;
        }
    }

    export class Builder
        implements
            Node.Builder<
                Data,
                ScratchData,
                ClavaControlFlowNode.Data,
                ClavaControlFlowNode.ScratchData
            >
    {
        #isConditional: boolean;
        #insertLocation: InsertLocation;
        
        constructor(isConditional: boolean, insertLocation: InsertLocation) {
            this.#isConditional = isConditional;
            this.#insertLocation = insertLocation;
        }

        buildData(data: ClavaControlFlowNode.Data): Data {
            return {
                ...data,
                [TAG]: {
                    version: VERSION,
                    isDropConditional: this.#isConditional,
                    isDropElaborated: false,
                    dropInsertLocation: this.#insertLocation,
                },
            };
        }

        buildScratchData(scratchData: ClavaControlFlowNode.ScratchData): ScratchData {
            return {
                ...scratchData,
            };
        }
    }

    export const TypeGuard = Node.TagTypeGuard<Data, ScratchData>(
        TAG,
        VERSION,
        (sData) => {
            return CoralCfgNode.TypeGuard.isScratchDataCompatible(sData);
        },
    );

    export interface Data extends CoralCfgNode.Data {
        [TAG]: {
            version: typeof VERSION;
            isDropConditional: boolean;
            isDropElaborated: boolean;
            dropInsertLocation: InsertLocation;
        };
    }

    export interface ScratchData extends CoralCfgNode.ScratchData {}

    export enum InsertLocation {
        BEFORE_TARGET = "before",
        AFTER_TARGET = "after",
    }
}

export default DropNode;

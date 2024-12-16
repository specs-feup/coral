import ClavaFunctionNode from "@specs-feup/clava-flow/ClavaFunctionNode";
import Node from "@specs-feup/flow/graph/Node";

namespace CoralFunctionNode {
    export const TAG = "__coral__coral_function_node";
    export const VERSION = "1";

    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends ClavaFunctionNode.Class<D, S> {
        
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
        buildData(data: ClavaFunctionNode.Data): Data {
            return {
                ...data,
                [TAG]: {
                    version: VERSION,
                    
                },
            };
        }

        buildScratchData(scratchData: ClavaFunctionNode.ScratchData): ScratchData {
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
        // [TAG]: {
        //     // functions: Map<string, Regionck>;
        //     // files: Map<string, StructDefsMap>;
        // };
    }
}

export default CoralFunctionNode;

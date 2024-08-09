import { BinaryOp, Joinpoint } from "clava-js/api/Joinpoints.js";
import SimplifyAssignment from "clava-js/api/clava/code/SimplifyAssignment.js";
import CoralNormalizer from "coral/normalize/CoralNormalizer";
import { LaraJoinPoint } from "lara-js/api/LaraJoinPoint.js";
import Query from "lara-js/api/weaver/Query.js";

export default class SimplifyAssignments implements CoralNormalizer.Pass {
    apply($jp: Joinpoint) {
        const binaryOps = Query.searchFrom($jp, BinaryOp, {
            self: (self: LaraJoinPoint) =>
                (self as BinaryOp).isAssignment && (self as BinaryOp).operator !== "=",
        });
        for (const $assign of binaryOps) {
            SimplifyAssignment($assign as BinaryOp);
        }
    }
}

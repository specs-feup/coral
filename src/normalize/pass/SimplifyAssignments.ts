import { BinaryOp, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import SimplifyAssignment from "@specs-feup/clava/api/clava/code/SimplifyAssignment.js";
import CoralNormalizer from "coral/normalize/CoralNormalizer";
import { LaraJoinPoint } from "@specs-feup/lara/api/LaraJoinPoint.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";

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

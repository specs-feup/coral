import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/Access";
import Loan from "@specs-feup/coral/mir/Loan";
import { FunctionJp, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import PathVarRef from "@specs-feup/coral/mir/path/PathVarRef";
import Region from "@specs-feup/coral/regionck/RegionVariable";
import RegionConstraint from "@specs-feup/coral/regionck/OutlivesConstraint";

export default class MissingLifetimeBoundError extends CoralError {
    constructor(
        region: Region,
        requiredBound: string,
        relevantConstraint: RegionConstraint,
        $fn: FunctionJp,
    ) {
        const builder = new ErrorMessageBuilder(
            "lifetime may not live long enough",
            relevantConstraint.$jp,
        )
            .codeString(
                $fn.originNode.code.split("\n")[0],
                `consider adding '#pragma coral lf ${region.name}: ${requiredBound}'`,
                $fn.originNode.line,
            )
            .code(
                relevantConstraint.$jp,
                `'${region.name}' must outlive '${requiredBound}'`,
            );

        super(builder.toString());

        this.name = this.constructor.name;
    }
}

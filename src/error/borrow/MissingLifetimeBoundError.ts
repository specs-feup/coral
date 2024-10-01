import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import Loan from "coral/mir/Loan";
import { FunctionJp, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import PathVarRef from "coral/mir/path/PathVarRef";
import RegionVariable from "coral/regionck/RegionVariable";
import OutlivesConstraint from "coral/regionck/OutlivesConstraint";

export default class MissingLifetimeBoundError extends CoralError {
    
    constructor(region: RegionVariable, requiredBound: string, relevantConstraint: OutlivesConstraint, $fn: FunctionJp) {
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

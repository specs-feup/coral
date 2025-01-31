import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/region/meta/MetaRegionBound";

export default class MissingLifetimeBoundError extends CoralError {
    constructor(
        requiredBound: MetaRegionBound,
        relevantConstraint: CoralCfgNode.Class,
        $fn: FunctionJp,
    ) {
        const builder = new ErrorMessageBuilder(
            "lifetime may not live long enough",
            relevantConstraint.jp,
        )
            .codeString(
                $fn.originNode.code.split("\n")[0],
                `consider adding '#pragma coral lf ${requiredBound.sup}: ${requiredBound.sub}'`,
                $fn.originNode.line,
            )
            .code(
                relevantConstraint.jp,
                `'${requiredBound.sup}' must outlive '${requiredBound.sub}'`,
            );

        super(builder.toString());

        this.name = this.constructor.name;
    }
}

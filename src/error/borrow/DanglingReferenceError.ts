import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import Loan from "coral/mir/Loan";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import PathVarRef from "coral/mir/path/PathVarRef";

export default class DanglingReferenceError extends CoralError {
    
    constructor($scopeEnd: Joinpoint, loan: Loan, $nextUse: Joinpoint | undefined, access: Access) {
        const builder = new ErrorMessageBuilder(
            `'${access.path.toString()}' does not live long enough`,
            loan.node.jp,
        )
            .code(access.path.innerVardecl, `'${access.path.toString()}' declared here`)
            .code(loan.node.jp, `borrowed value does not live long enough`)
            .codeString(
                "}",
                `'${access.path.toString()}' dropped here while still borrowed`,
                $scopeEnd.originNode.endLine,
        );

        if ($nextUse) {
            builder
                .code($nextUse, "borrow is later used here");
        }
        
        super(builder.toString());
        
        this.name = this.constructor.name;
    }
}

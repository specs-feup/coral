import {
    DeclStmt,
    Joinpoint,
    Vardecl,
} from "clava-js/api/Joinpoints.js";
import CoralNormalizer from "coral/normalize/CoralNormalizer";
import Query from "lara-js/api/weaver/Query.js";

export default class SplitVarDecls implements CoralNormalizer.Pass {
    apply($jp: Joinpoint) {
        if (!($jp instanceof DeclStmt)) {
            for (const $stmt of Query.searchFrom($jp, "declStmt")) {
                this.apply($stmt as DeclStmt);
            }
            return;
        }

        for (const $vardecl of $jp.decls) {
            if ($vardecl instanceof Vardecl) {
                $jp.insertBefore($vardecl);
            }
        }

        $jp.detach();
    }
}

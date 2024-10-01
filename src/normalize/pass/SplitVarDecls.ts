import {
    DeclStmt,
    Joinpoint,
    Vardecl,
} from "@specs-feup/clava/api/Joinpoints.js";
import CoralNormalizer from "coral/normalize/CoralNormalizer";
import Query from "@specs-feup/lara/api/weaver/Query.js";

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
                $vardecl.detach();
                $jp.insertBefore($vardecl);
            }
        }

        $jp.detach();
    }
}

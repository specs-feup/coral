import { DeclStmt, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import { NormalizationPass } from "@specs-feup/coral/pipeline/CoralNormalizer";

export default class SplitVarDecls implements NormalizationPass<typeof DeclStmt> {
    query = DeclStmt;

    apply($jp: DeclStmt) {
        for (const $decl of $jp.decls) {
            $decl.detach();
            $jp.insertBefore($decl);
        }

        $jp.detach();
    }
}

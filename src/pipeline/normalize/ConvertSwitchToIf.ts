import { Switch } from "@specs-feup/clava/api/Joinpoints.js";
import TransformSwitchToIf from "@specs-feup/clava/api/clava/pass/TransformSwitchToIf.js";
import { NormalizationContext, NormalizationPass } from "../CoralNormalizer.js";

export default class ConvertSwitchToIf implements NormalizationPass<typeof Switch> {
    get query() {
        return Switch;
    }

    apply($jp: Switch, context: NormalizationContext): void {

        const clavaPass = new TransformSwitchToIf(true);
        
        clavaPass.apply($jp);
    }
}
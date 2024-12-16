import Clava from "@specs-feup/clava/api/clava/Clava.js";
import { FunctionJp, Program } from "@specs-feup/clava/api/Joinpoints.js";
import CoralAnalyzer from "@specs-feup/coral/pipeline/CoralAnalyzer";
import CoralNormalizer from "@specs-feup/coral/pipeline/CoralNormalizer";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import Query from "@specs-feup/lara/api/weaver/Query.js";


export interface CoralConfig {
    debug: boolean;
    /**
     * Whether functions with implementation but without explicit safe or unsafe
     * annotations should be considered safe or unsafe.
     * 
     * Note that this option has no effect if the function has no implementation,
     * in which case it is considered unsafe by default, as no checks can be performed.
     * 
     * The recommended value is `true`, but it may be useful to set it to `false`
     * in existing codebases, to ease the transition to Coral.
     */
    safeByDefault: boolean;
    // #inferFunctionLifetimes: boolean;
    // #iterationLimit?: number;
    // #mirDotFile: string | undefined;
    // #livenessDotFile: string | undefined;
}

export const defaultCoralConfig: CoralConfig = {
    debug: false,
    safeByDefault: true,
};

export default function run_coral(config: Partial<CoralConfig> = {}) {
    const completeConfig = { ...defaultCoralConfig, ...config };
    Clava.pushAst(); // Additional copy for normalization

    // TODO put this in a better place
    const functionsToAnalyze = Query.search(FunctionJp, $fn => {
        if (!$fn.isImplementation) {
            return false;
        }
        const pragmas = CoralPragma.parse($fn.pragmas);
        const isSafe = pragmas.some($p => $p.isFlag("safe"));
        const isUnsafe = pragmas.some($p => $p.isFlag("unsafe"));
        if (isSafe && isUnsafe) {
            // TODO graceful error handling
            throw new Error(`Function ${$fn.name} cannot be both safe and unsafe`);
        }
        if (isUnsafe) {
            return false;
        }
        return isSafe || completeConfig.safeByDefault;
    }).get();
    new CoralNormalizer(completeConfig).apply(functionsToAnalyze);
    new CoralAnalyzer(completeConfig).apply(functionsToAnalyze);
    // new CoralCodeGenerator(completeConfig).apply($root); TODO
}

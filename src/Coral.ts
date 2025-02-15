import Clava from "@specs-feup/clava/api/clava/Clava.js";
import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import CoralDotFormatter from "@specs-feup/coral/graph/dot/CoralDotFormatter";
import Instrumentation from "@specs-feup/coral/instrumentation/Instrumentation";
import CoralAnalyzer from "@specs-feup/coral/pipeline/CoralAnalyzer";
import CoralCodeGenerator from "@specs-feup/coral/pipeline/CoralCodeGenerator";
import CoralNormalizer from "@specs-feup/coral/pipeline/CoralNormalizer";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import Query from "@specs-feup/lara/api/weaver/Query.js";


export interface CoralConfig {
    /**
     * Logs additional information to files and the console.
     * 
     * This option increases the amound of information logged by Coral,
     * but it will only use the console if verbose is also active.
     */
    debug: boolean;
    /**
     * Whether to print to console additional information during
     * the analysis, such as progress updates.
     */
    verbose: boolean;
    /**
     * Saves relevant instrumentation data for result analysis.
     */
    instrumentation: boolean;
    outDir: string;
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
    inferFunctionLifetimeBounds: boolean;
    inferFunctionLifetimeBoundsIterationLimit?: number;
}

export const defaultCoralConfig: CoralConfig = {
    debug: false,
    verbose: false,
    instrumentation: false,
    outDir: "out",
    safeByDefault: true,
    inferFunctionLifetimeBounds: false,
    inferFunctionLifetimeBoundsIterationLimit: 10,
};

export default function run_coral(config: Partial<CoralConfig> = {}) {
    const completeConfig = { ...defaultCoralConfig, ...config };
    const instrumentation = new Instrumentation(completeConfig);
    instrumentation.logDebug("Running Coral with config", completeConfig);

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
    
    let graph: CoralGraph.Class | undefined;
    try {
        new CoralNormalizer(instrumentation).apply(functionsToAnalyze);
        graph = new CoralAnalyzer(completeConfig, instrumentation).apply(functionsToAnalyze);
        new CoralCodeGenerator(graph).apply();
    } finally {
        if (completeConfig.instrumentation) {
            instrumentation.saveCheckpoints();
        }
        if (completeConfig.debug && graph !== undefined) {
            graph.toFile(new CoralDotFormatter(), graph.instrumentation.debugDir + "/graph/final.dot")
            graph.instrumentation.printTotalTime(); 
        }
    }
}

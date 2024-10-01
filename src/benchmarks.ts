// Without this import, clava does not work for some reason
import "@specs-feup/clava/api/Joinpoints.js";

import Clava from "@specs-feup/clava/api/clava/Clava.js";
import Io from "@specs-feup/lara/api/lara/Io.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import ClavaJoinPoints from "@specs-feup/clava/api/clava/ClavaJoinPoints.js";
import { Call, Cast, Decl, FunctionJp, FunctionType, IntLiteral, Literal, Op, UnaryOp, Vardecl, Varref } from "@specs-feup/clava/api/Joinpoints.js";
import System from "@specs-feup/lara/api/lara/System.js";
    
import CoralPipeline from "coral/CoralPipeline";

function stringifyReplacer(key: unknown, value: unknown): unknown {
    if (value instanceof Map) {
        return {
            dataType: "Map",
            value: Array.from(value.entries()),
        };
    } else if (key === "buildError" || key === "actualException") {
        if (value instanceof Error) {
            return {
                name: value.name,
                message: value.message,
            };
        } else if (value !== undefined) {
            return {
                unknown: value,
            };
        } else {
            return value;
        }
    } else if (value instanceof Call) {
        return `${value.type.desugarAll.code} ${value.signature}`;
    } else if (value instanceof FunctionJp) {
        return `${value.type.desugarAll.code} ${value.signature}`;
    } else {
        return value;
    }
}

class CoralBenchmarkTester {
    #baseFolder: string;
    #pipeline: CoralPipeline;
    #writeTo: string | undefined;
    #omitTree: CoralBenchmarkTester.Options.OmitTree;
    #blacklist: string[] = [];
    #includes: string[] = [];
    #fatalErrors = 0;
    #nonFatalErrors = 0;

    constructor(testFolder: string, pipeline: CoralPipeline) {
        this.#baseFolder = testFolder;
        this.#pipeline = pipeline;
        this.#writeTo = undefined;
        this.#omitTree = CoralBenchmarkTester.Options.OmitTree.NONE;
        this.#blacklist = [];
        this.#includes = [];
    }

    includes(includes: string[]) {
        this.#includes = includes;
        return this;
    }

    blacklist(blacklist: string[]) {
        this.#blacklist = blacklist;
        return this;
    }

    omitTree(omit: CoralBenchmarkTester.Options.OmitTree) {
        this.#omitTree = omit;
        return this;
    }

    writeTo(path: string) {
        this.#writeTo = path;
        return this;
    }

    run() {
        const results = this.#runTestCase("");
        this.#printResults(results);
    }

    #printResultsTree(
        head: string,
        results: CoralBenchmarkTester.TestCaseResults,
        prefix: string = "",
        headPrefix: string = "",
    ) {
        const info = results.total === 0
            ? "No tests"
            : (results.failed === 0
                ? "Pass"
                : `Failed ${results.failed} out of ${results.total} tests`);
            
            
            
        console.log(`${headPrefix}${head} (${info})`);

        if (
            this.#omitTree === CoralBenchmarkTester.Options.OmitTree.PASSED_CHILDREN &&
            results.failed === 0
        ) {
            return;
        }

        let content = [...results.content];
        if (this.#omitTree === CoralBenchmarkTester.Options.OmitTree.PASSED) {
            content = content.filter(([, r]) => r.failed > 0);
        }
        let countdown = content.length;

        for (const [name, subresults] of content) {
            countdown -= 1;
            console.log(prefix + "|");
            if (subresults.type === "testcase") {
                const newPrefix = countdown === 0 ? "     " : "|    ";
                this.#printResultsTree(
                    name,
                    subresults,
                    prefix + newPrefix,
                    prefix + "+--> ",
                );
            } else {
                const newPrefix = countdown === 0 ? "     " : "|    ";
                this.#printResultFunctions(
                    name,
                    subresults,
                    prefix + newPrefix,
                    prefix + "+--> ",
                );
            }
        }
    }

    #printResultFunctions(
        head: string,
        results: CoralBenchmarkTester.TestResults,
        prefix: string = "",
        headPrefix: string = "",
    ) {
        const info = results.total === 0
            ? "No functions"
            : (results.failed === 0
                ? "Pass"
                : `Failed ${results.failed} out of ${results.total} functions`);
        console.log(`${headPrefix}${head} (${info})`);

        if (
            this.#omitTree === CoralBenchmarkTester.Options.OmitTree.PASSED_CHILDREN &&
            results.failed === 0
        ) {
            return;
        }

        let content = [...results.content];
        if (this.#omitTree === CoralBenchmarkTester.Options.OmitTree.PASSED) {
            content = content.filter(([, r]) => r.result === "Pass");
        }
        let countdown = content.length;

        for (const [name, subresults] of content) {
            countdown -= 1;
            console.log(prefix + "|");

            const ptr = subresults.hasPointers ? " [*]" : "";

            let excp = "";
            if (subresults.actualException instanceof Error) {
                excp = ` [${subresults.actualException.name}]`;
            } else if (subresults.actualException !== undefined) {
                excp = ` [unkn-err: ${subresults.actualException}]`;
            }

            const callFnNames: string[] = [];
            const callSignatures: string[] = [];
            for (const call of subresults.externalCalls) {
                const callName = call.function ? call.function.name : call.signature;
                if (callFnNames.includes(callName)) {
                    continue;
                }
                callSignatures.push(`${call.type.desugarAll.code} ${call.signature}`);
                callFnNames.push(callName);
            }
            const externalCalls = subresults.externalCalls.length > 0 ? " [calls: " + callSignatures.join(", ") + "]" : "";

            const globalsConverted = subresults.fnWithAddedGlobalsAsParams ? " [globals converted]" : "";

            console.log(
                `${prefix}+--> ${subresults.$fn.type.desugarAll.code} ${subresults.$fn.signature} (${subresults.result}) [${subresults.runTime}ns]${ptr}${excp}${globalsConverted}${externalCalls}`,
            );
        }
    }

    #printResults(results: CoralBenchmarkTester.TestCaseResults) {
        if (this.#writeTo !== undefined) {
            Io.writeFile(this.#writeTo, JSON.stringify(results, stringifyReplacer, 4));
        }

        console.log("\n\n========== Test results: ==========");
        this.#printResultsTree(".", results);
    }

    #addFolderToClava(basePath: string, relativePath: string = "") {
        const completePath = this.#baseFolder + basePath + relativePath;
        // if ([""].includes(completePath.split("/")[completePath.split("/").length - 1])) {
        //     return;
        // }

        if (Io.isFolder(completePath)) {
            for (const subpath of Io.getPaths(completePath)) {
                this.#addFolderToClava(basePath, relativePath + "/" + subpath.getName());
            }
        } else if (Io.isFile(completePath)) {
            let isBlacklisted = false;
            for (const blacklisted of this.#blacklist) {
                if (completePath.endsWith(blacklisted)) {
                    isBlacklisted = true;
                    break;
                }
            }
            if (!isBlacklisted) {
                if (completePath.endsWith(".c") || completePath.endsWith(".h") || completePath.endsWith(".cpp") || completePath.endsWith(".hpp")) {
                    const $file = ClavaJoinPoints.file(completePath);
                    // $file.setRelativeFolderpath(basePath+relativePath+"/.."); TODO this doesn't work
                    Clava.addFile($file);
                }
            }
            
        }
    }

    #runFunctionTest($fn: FunctionJp, fnWithAddedGlobalsAsParams: boolean): CoralBenchmarkTester.FunctionTestResults {
        const result: CoralBenchmarkTester.FunctionTestResults = {
            type: "function-test",
            result: "Pass",
            actualException: undefined,
            hasPointers:
                Query.searchFrom($fn, "vardecl")
                    .get()
                    .find(($v) => ($v as Vardecl).type.isPointer) !== undefined ||
                Query.searchFrom($fn, "op")
                    .get()
                    .find(($o) => ($o as UnaryOp).kind === "addr_of") !== undefined,
            externalCalls: Query.searchFrom($fn, "call").get() as Call[],
            $fn,
            resultCode: "",
            originalCode: $fn.code,
            fnWithAddedGlobalsAsParams,
            runTime: 0,
        };

        let initTime = System.nanos();
        let endTime: number | undefined;

        try {
            Clava.pushAst();

            for (const $fn2_ of Query.search("function")) {
                const $fn2 = $fn2_ as FunctionJp;
                if ($fn2.isImplementation && $fn2.name !== $fn.name) {
                    $fn2.body.detach();
                }
            }

            initTime = System.nanos();
            this.#pipeline.apply();
            endTime = System.nanos();


            for (const $fn2_ of Query.search("function")) {
                const $fn2 = $fn2_ as FunctionJp;
                if ($fn2.isImplementation && $fn2.name === $fn.name) {
                    result.resultCode = $fn2.code;
                }
            }
            this.#nonFatalErrors++;
        } catch (e) {
            if (endTime === undefined) {
                endTime = System.nanos();
            }
            if (!(e instanceof CoralError)) {
                console.log(`Fatal error ${this.#fatalErrors++}/${this.#nonFatalErrors} (in function ${ $fn.name })`);
            } else {
                this.#nonFatalErrors++;
            }
            result.actualException = e;
            result.result = "Fail";
        } finally {
            Clava.popAst();
        }

        result.runTime = endTime - initTime;

        return result;
    }

    #runTest(path: string): CoralBenchmarkTester.TestResults {
        console.log(`Running test ${path}`);
        Clava.pushAst();

        this.#addFolderToClava(path);
        for (const include of this.#includes) {
            this.#addFolderToClava(include);
        }

        const result: CoralBenchmarkTester.TestResults = {
            type: "test",
            content: new Map(),
            parsedFns: [],
            ignoredFns: [],
            fnsWithAddedGlobalsAsParams: [],
            alloc_poison: [],
            passed: 0,
            failed: 0,
            total: 0,
            buildError: undefined,
        };

        try {
            Clava.rebuild();
            new BenchmarkFilterer(result).apply();

            for (const $fn of result.parsedFns) {
                console.log(`Running test ${path} (function ${ $fn.name })`);
                const fnResult = this.#runFunctionTest($fn, result.fnsWithAddedGlobalsAsParams.some($f => $f.name === $fn.name));
                result.content.set($fn.name, fnResult);
                fnResult.result === "Pass" ? (result.passed += 1) : (result.failed += 1);
                result.total += 1;
            }
        } catch (e) {
            result.buildError = e;
            console.log(`Fatal error ${this.#fatalErrors++}/${this.#nonFatalErrors} (in path ${ path })`);
        } finally {
            Clava.popAst();
        }

        return result;
    }

    #runTestCase(
        path: string,
        isInner: boolean = false,
    ): CoralBenchmarkTester.TestCaseResults {
        const results: CoralBenchmarkTester.TestCaseResults = {
            type: "testcase",
            content: new Map(),
            passed: 0,
            failed: 0,
            total: 0,
        };
        for (const subpath of Io.getPaths(this.#baseFolder + "/" + path)) {
            const subpathParts = subpath.getName().split(".");
            const testName = subpathParts[0];

            if (Io.isFolder(subpath)) {
                if (!isInner) {
                    // if (!subpath.getName().endsWith("CHStone")) continue;
                    const subresults = this.#runTestCase(path + "/" + testName, true);
                    results.content.set(testName, subresults);
                    results.passed += subresults.passed;
                    results.failed += subresults.failed;
                    results.total += subresults.total;
                } else {
                    const result = this.#runTest(path + "/" + subpath.getName());
                    results.content.set(testName, result);
                    results.passed += result.passed;
                    results.failed += result.failed;
                    results.total += result.total;
                }
            } else if (Io.isFile(subpath)) {
                const result = this.#runTest(path + "/" + subpath.getName());
                results.content.set(testName, result);
                results.passed += result.passed;
                results.failed += result.failed;
                results.total += result.total;
            }
        }
        return results;
    }
}

namespace CoralBenchmarkTester {
    export namespace Options {
        export enum OmitTree {
            NONE = "none",
            PASSED = "passed",
            PASSED_CHILDREN = "passedChildren",
        }
    }

    export type TestCaseResults = {
        type: "testcase";
        content: Map<string, TestResults | TestCaseResults>;
        passed: number;
        failed: number;
        total: number;
    };

    export type TestResults = {
        type: "test";
        content: Map<string, FunctionTestResults>;
        passed: number;
        failed: number;
        total: number;
        parsedFns: FunctionJp[];
        ignoredFns: FunctionJp[];
        fnsWithAddedGlobalsAsParams: FunctionJp[];
        alloc_poison: string[];
        buildError: unknown | undefined;
    };

    export type FunctionTestResults = {
        type: "function-test";
        result: "Pass" | "Fail";
        actualException: unknown | undefined;
        hasPointers: boolean;
        externalCalls: Call[];
        $fn: FunctionJp;
        resultCode: string;
        originalCode: string;
        fnWithAddedGlobalsAsParams: boolean;
        runTime: number;
    };
}

class BenchmarkFilterer {
    #result: CoralBenchmarkTester.TestResults;

    constructor(result: CoralBenchmarkTester.TestResults) {
        this.#result = result;
    }

    filter($fn: FunctionJp, predicate: (fn: FunctionJp) => boolean): boolean {
        if (predicate($fn)) {
            return true;
        } else {
            this.#result.ignoredFns.push($fn);
            $fn.body.detach();
            return false;
        }
    }

    noArrays($function: FunctionJp) {
        // a+b, a-b, a+=b, a-=b, a++, ++a, a--, --a
        const pointerArithOps = new Set([
            "add",
            "sub",
            "add_assign",
            "sub_assign",
            "post_inc",
            "pre_inc",
            "post_dec",
            "pre_dec",
        ]);
        for (const op_ of Query.searchFrom($function, "op")) {
            const op = op_ as Op;
            if (!pointerArithOps.has(op.kind)) {
                continue;
            }
            for (const child of op.children) {
                if (child.type.isPointer) {
                    return false;
                }
            }
        }

        // Check declarations
        for (const decl_ of Query.searchFrom($function, "decl")) {
            const decl = decl_ as Decl;
            if (decl.type.isArray) {
                return false;
            }
        }

        // Check array accesses
        // Any array access counts has having arrays
        for (const _ of Query.searchFrom($function, "arrayAccess")) {
            return false;
        }

        return true;
    }

    noFunctionPointers($function: FunctionJp) {
        for (const $varref_ of Query.searchFrom($function, "varref")) {
            const $varref = $varref_ as Varref;

            if (
                !(
                    $varref.parent instanceof Call && $varref.parent.name === $varref.name
                ) &&
                $varref.type instanceof FunctionType
            ) {
                return false;
            }
        }
        return true;
    }

    noComplexGlobals($function: FunctionJp) {
        for (const $varref_ of Query.searchFrom($function, "varref")) {
            const $varref = $varref_ as Varref;
            if (
                !(
                    $varref.parent instanceof Call && $varref.parent.name === $varref.name
                ) &&
                $varref.vardecl.isGlobal
            ) {
                if (
                    $varref.vardecl.type.isPointer ||
                    $varref.vardecl.type.isArray ||
                    !$varref.vardecl.type.isBuiltin ||
                    $varref.use !== "read"
                ) {
                    return false;
                }
            }
        }
        return true;
    }

    globalsAsParams($function: FunctionJp) {
        let changed = false;
        for (const $varref_ of Query.searchFrom($function, "varref")) {
            const $varref = $varref_ as Varref;
            if (
                !(
                    $varref.parent instanceof Call && $varref.parent.name === $varref.name
                ) &&
                $varref.vardecl.isGlobal
            ) {
                const $param = $function.params.find(($p) => $p.name === $varref.name);
                changed = true;
                if ($param) {
                    $varref.replaceWith(ClavaJoinPoints.varRef($param));
                } else {
                    const $type = $varref.type.asConst();
                    $function.addParam($varref.name, $type);
                    $varref.replaceWith(
                        ClavaJoinPoints.varRef(
                            $function.params[$function.params.length - 1],
                        ),
                    );
                }
            }
        }
        if (changed) {
            this.#result.fnsWithAddedGlobalsAsParams.push($function);
        }
    }

    removeNullPtrTypecasts($function: FunctionJp) {
        for (const $cast_ of Query.searchFrom($function, "cast")) {
            const $cast = $cast_ as Cast;
            if ($cast.subExpr instanceof IntLiteral && $cast.subExpr.value === 0) {
                $cast.replaceWith($cast.subExpr);
            }
        }
    }

    #poison(predicate: (fn: FunctionJp) => boolean) {
        const poison: string[] = [];
        let changed = true;
        while (changed) {
            changed = false;

            for (const $fn_ of Query.search("function")) {
                const $fn = $fn_ as FunctionJp;
                if (!$fn.isImplementation) {
                    continue;
                }

                if (poison.includes($fn.name)) {
                    continue;
                }

                if (predicate($fn)) {
                    poison.push($fn.name);
                    changed = true;
                }

                for (const $call_ of Query.searchFrom($fn, "call")) {
                    const $call = $call_ as Call;
                    if (poison.includes($call.name)) {
                        poison.push($fn.name);
                        changed = true;
                        break;
                    }
                }
            }
        }
        return poison;
    }

    #hasAlloc($function: FunctionJp) {
        for (const $call_ of Query.searchFrom($function, "call")) {
            const $call = $call_ as Call;
            if (
                [
                    "malloc",
                    "alloc",
                    "realloc",
                    "free",
                    "calloc",
                    "aligned_alloc",
                    "posix_memalign",
                ].includes($call.name)
            ) {
                return true;
            }
        }
        return false;
    }

    apply() {
        this.#result.alloc_poison = this.#poison(this.#hasAlloc);

        for (const $fn_ of Query.search("function")) {
            const $fn = $fn_ as FunctionJp;
            if (!$fn.isImplementation) {
                continue;
            }

            if (!this.filter($fn, this.noArrays)) continue;
            if (!this.filter($fn, this.noFunctionPointers)) continue;
            if (!this.filter($fn, this.noComplexGlobals)) continue;
            if (!this.filter($fn, ($fn) => !this.#result.alloc_poison.includes($fn.name))) continue;
            this.removeNullPtrTypecasts($fn);
            this.globalsAsParams($fn);
            this.#result.parsedFns.push($fn);
        }
    }
}

// TODO use getContextFolder() instead of Node functions
//      for now, this is not possible in clava
// const rootFolder = Clava.getData().getContextFolder();
import path from "path";
import { fileURLToPath } from "url";
import CoralError from "coral/error/CoralError";
const rootFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");


// CHALLENGES
// const testFolder = rootFolder + "/in/challenges";
// new CoralBenchmarkTester(testFolder, new CoralPipeline())
//     .writeTo(rootFolder + "/out/woven_code/challenges/stats.json")
//     .omitTree(CoralBenchmarkTester.Options.OmitTree.NONE)
//     .blacklist(["pov.c"])
//     .includes(["/../challenges_include/include"])
//     .run();


// BENCHMARKS
const testFolder = rootFolder + "/in/benchmarks";
new CoralBenchmarkTester(testFolder, new CoralPipeline())
    .writeTo(rootFolder + "/out/woven_code/benchmarks/stats.json")
    .omitTree(CoralBenchmarkTester.Options.OmitTree.NONE)
    .run();

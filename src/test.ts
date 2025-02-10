import Clava from "@specs-feup/clava/api/clava/Clava.js";
import Io from "@specs-feup/lara/api/lara/Io.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import ClavaJoinPoints from "@specs-feup/clava/api/clava/ClavaJoinPoints.js";
import { Call, FunctionJp, Pragma } from "@specs-feup/clava/api/Joinpoints.js";
import CoralError from "@specs-feup/coral/error/CoralError";

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

class CoralTester {
    #baseFolder: string;
    #pipeline: () => void;
    #writeTo: string | undefined;
    #omitTree: CoralTester.Options.OmitTree;

    #CORAL_TEST_UTILS_PRAGMA_NAME = "coral_test";

    constructor(testFolder: string, pipeline: () => void) {
        this.#baseFolder = testFolder;
        this.#pipeline = pipeline;
        this.#writeTo = undefined;
        this.#omitTree = CoralTester.Options.OmitTree.NONE;
    }

    omitTree(omit: CoralTester.Options.OmitTree) {
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
        if (results.failed > 0) {
            Io.writeFile("./out/.failed", `${results.failed}`);
        }
    }

    #printResultsTree(
        head: string,
        results: CoralTester.TestCaseResults,
        prefix: string = "",
        headPrefix: string = "",
    ) {
        const info =
            results.failed === 0
                ? "Pass"
                : `Failed ${results.failed} out of ${results.total} tests`;
        console.log(`${headPrefix}${head} (${info})`);

        if (
            this.#omitTree === CoralTester.Options.OmitTree.PASSED_CHILDREN &&
            results.failed === 0
        ) {
            return;
        }

        let content = [...results.content];
        if (this.#omitTree === CoralTester.Options.OmitTree.PASSED) {
            content = content.filter(
                ([, r]) =>
                    (r.type === "testcase" && r.failed > 0) ||
                    (r.type === "test" && r.result !== "Pass"),
            );
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
                console.log(`${prefix}+--> ${name} (${subresults.result})`);
            }
        }
    }

    #printResults(results: CoralTester.TestCaseResults) {
        if (this.#writeTo !== undefined) {
            Io.writeFile(
                this.#writeTo + "/stats.json",
                JSON.stringify(results, stringifyReplacer, 4),
            );
        }

        console.log("\n\n========== Test results: ==========");
        this.#printResultsTree(".", results);
    }

    #addFolderToClava(basePath: string, relativePath: string = "") {
        const completePath = this.#baseFolder + basePath + relativePath;
        if (Io.isFolder(completePath)) {
            for (const subpath of Io.getPaths(completePath)) {
                this.#addFolderToClava(basePath, relativePath + "/" + subpath.getName());
            }
        } else if (Io.isFile(completePath)) {
            const $file = ClavaJoinPoints.file(completePath);
            // $file.setRelativeFolderpath(basePath+relativePath+"/.."); TODO this doesn't work
            Clava.addFile($file);
        }
    }

    #getGlobalTestUtilsPragma(
        ...subcommands: string[]
    ): { raw: Pragma; content: string[] }[] {
        const matches = [];

        for (const $jp of Query.search("pragma")) {
            const $pragma = $jp as Pragma;

            if ($pragma.name !== this.#CORAL_TEST_UTILS_PRAGMA_NAME) {
                continue;
            }

            const content = $pragma.content.split(" ");
            if (content.length < subcommands.length) {
                continue;
            }
            let matched = true;
            for (let i = 0; i < subcommands.length; i++) {
                if (content[i] !== subcommands[i]) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                matches.push({ raw: $pragma, content });
            }
        }
        return matches;
    }

    #runTest(
        path: string,
        isOkExpected: boolean = true,
        singleFile: boolean = false,
    ): CoralTester.TestResults {
        Clava.pushAst();

        this.#addFolderToClava(path);

        // TODO is there a way to temporarily redirect stdout to a file?
        // setPrintStream(this.#writeTo + "/" + "/log.txt");

        const result: CoralTester.TestResults = {
            type: "test",
            result: "Pass",
            expectedExceptions: [],
            actualException: undefined,
            runTime: 0,
        };

        let initTime: number | undefined;
        let endTime: number | undefined;
        let pass = isOkExpected;
        let doublePush = false;

        try {
            Clava.rebuild();

            if (!isOkExpected) {
                for (const $pragma of this.#getGlobalTestUtilsPragma("expect")) {
                    result.expectedExceptions.push($pragma.content[1]);
                }

                if (result.expectedExceptions.length === 0) {
                    result.expectedExceptions.push("CoralError");
                }
            }

            doublePush = true;
            initTime = System.nanos();
            this.#pipeline();
            endTime = System.nanos();

            if (this.#writeTo !== undefined) {
                let writeTo = this.#writeTo + "/" + path;
                if (singleFile) {
                    writeTo += "/..";
                }
                Clava.writeCode(writeTo);
            }
        } catch (e) {
            if (endTime === undefined) {
                endTime = System.nanos();
            }
            if (e instanceof CoralError) {
                result.actualException = e;
                pass =
                    !isOkExpected &&
                    result.expectedExceptions.some((error) => e.name === error);
                if (!pass) {
                    if (this.#writeTo === undefined) {
                        console.log(e.stack);
                    } else {
                        const writeTo = this.#writeTo + "/" + path + ".log.txt";
                        // writeTo(writeTo, e.stack);
                    }
                }
            } else if (e instanceof Error) {
                console.log(e.stack);
                throw e;
            } else {
                throw e;
            }
        } finally {
            Clava.popAst();
            if (doublePush) {
                Clava.popAst();
            }
        }

        if (initTime === undefined) {
            result.runTime = 0;
        } else {
            result.runTime = endTime - initTime;
        }

        if (pass) {
            result.result = "Pass";
        } else {
            result.result = "Fail";
        }

        return result;
    }

    isOkExpected(subpathParts: string[]): boolean {
        if (subpathParts[1] === "ok") {
            return true;
        } else if (subpathParts[1] === "err") {
            return false;
        } else {
            throw new Error("Invalid test type: " + subpathParts[1]);
        }
    }

    #runTestCase(path: string): CoralTester.TestCaseResults {
        const results: CoralTester.TestCaseResults = {
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
                if (subpathParts.length === 1) {
                    const subresults = this.#runTestCase(path + "/" + testName);
                    results.content.set(testName, subresults);
                    results.passed += subresults.passed;
                    results.failed += subresults.failed;
                    results.total += subresults.total;
                } else {
                    const result = this.#runTest(
                        path + "/" + subpath.getName(),
                        this.isOkExpected(subpathParts),
                    );
                    results.content.set(testName, result);
                    result.result === "Pass"
                        ? (results.passed += 1)
                        : (results.failed += 1);
                    results.total += 1;
                }
            } else if (Io.isFile(subpath)) {
                const result = this.#runTest(
                    path + "/" + subpath.getName(),
                    this.isOkExpected(subpathParts),
                    true,
                );
                results.content.set(testName, result);
                result.result === "Pass" ? (results.passed += 1) : (results.failed += 1);
                results.total += 1;
            }
        }
        return results;
    }
}

namespace CoralTester {
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
        result: "Pass" | "Fail";
        expectedExceptions: string[];
        actualException: Error | undefined;
        runTime: number;
    };
}

// TODO use getContextFolder() instead of Node functions
//      for now, this is not possible in Clava-JS
// const rootFolder = Clava.getData().getContextFolder();
import path from "path";
import { fileURLToPath } from "url";
import System from "@specs-feup/lara/api/lara/System.js";
import run_coral from "@specs-feup/coral/Coral";
const rootFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const testFolder = rootFolder + "/in/test";
new CoralTester(testFolder, () => run_coral({verbose: true, inferFunctionLifetimeBounds: true }))
    .omitTree(CoralTester.Options.OmitTree.PASSED)
    .run();

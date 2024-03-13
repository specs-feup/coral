import Clava from "clava-js/api/clava/Clava.js";
import Io from "lara-js/api/lara/Io.js";
import Query from "lara-js/api/weaver/Query.js";
import ClavaJoinPoints from "clava-js/api/clava/ClavaJoinPoints.js";
import { Pragma } from "clava-js/api/Joinpoints.js";

import CoralPipeline from "coral/CoralPipeline";
import CoralError from "coral/error/CoralError";
import MutateWhileBorrowedError from "coral/error/borrow/MutateWhileBorrowedError";
import UseWhileMutBorrowedError from "coral/error/borrow/UseWhileMutBorrowedError";

interface TypeOf<T> {
    new (...args: never[]): T;
}

class CoralTester {
    #baseFolder: string;
    #pipeline: CoralPipeline;
    #writeTo: string | null;
    #omitTree: CoralTester.Options.OmitTree;

    #CORAL_TEST_UTILS_PRAGMA_NAME = "coral_test";

    constructor(testFolder: string, pipeline: CoralPipeline) {
        this.#baseFolder = testFolder;
        this.#pipeline = pipeline;
        this.#writeTo = null;
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
                console.log(`${prefix}+--> ${name} (${subresults.result})`); // TODO maybe print more context
            }
        }
    }

    #printResults(results: CoralTester.TestCaseResults) {
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

    // TODO possibly unify with CORAL pragma logic
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

    #getErrorClass(error: string): TypeOf<CoralError> {
        // Reflection is avoided to prevent possible unintended vulnerabilities
        // Instead, allowed errors are hardcoded
        switch (error) {
            case "CoralError":
                return CoralError;
            case "MutateWhileBorrowedError":
                return MutateWhileBorrowedError;
            case "UseWhileMutBorrowedError":
                return UseWhileMutBorrowedError;
            case "Error":
                return Error;
            default:
                throw new Error("Unsupported error class: " + error);
        }
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
            actualException: null,
        };
        let pass = isOkExpected;

        try {
            Clava.rebuild();

            if (!isOkExpected) {
                for (const $pragma of this.#getGlobalTestUtilsPragma("expect")) {
                    result.expectedExceptions.push(
                        this.#getErrorClass($pragma.content[1]),
                    );
                }

                if (result.expectedExceptions.length === 0) {
                    result.expectedExceptions.push(CoralError);
                }
            }

            this.#pipeline.apply();
            if (this.#writeTo !== null) {
                let writeTo = this.#writeTo + "/" + path;
                if (singleFile) {
                    writeTo += "/..";
                }
                Clava.writeCode(writeTo);
            }
        } catch (e) {
            if (e instanceof CoralError) {
                result.actualException = e;
                pass =
                    !isOkExpected &&
                    result.expectedExceptions.some((error) => e instanceof error);
                if (!pass) {
                    if (this.#writeTo === null) {
                        console.log(e.stack);
                    } else {
                        const writeTo = this.#writeTo + "/" + path + ".log.txt";
                        // writeTo(writeTo, e.stack);
                    }
                }
            } else if (e instanceof Error) {
                console.log(e.stack);
            } else {
                throw e;
            }
        } finally {
            Clava.popAst();
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
        expectedExceptions: TypeOf<Error>[];
        actualException: Error | null;
    };
}

// TODO change context folder into some function that gives the root of the project
const rootFolder = Clava.getData().getContextFolder();
const testFolder = rootFolder + "/in/test";
new CoralTester(testFolder, new CoralPipeline())
    .writeTo(rootFolder + "/out/woven_code/test")
    .omitTree(CoralTester.Options.OmitTree.PASSED)
    .run();

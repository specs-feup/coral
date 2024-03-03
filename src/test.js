laraImport("clava.Clava");
laraImport("clava.ClavaJoinPoints");
laraImport("lara.Io");
laraImport("weaver.Query");

laraImport("coral.CoralPipeline");
laraImport("coral.error.CoralError");
laraImport("coral.error.borrow.MutateWhileBorrowedError");
laraImport("coral.error.borrow.UseWhileMutBorrowedError");

class CoralTester {
    #baseFolder;
    #pipeline;
    #writeTo;
    #omitTree;

    #CORAL_TEST_UTILS_PRAGMA_NAME = "coral_test";

    constructor(testFolder, pipeline) {
        this.#baseFolder = testFolder;
        this.#pipeline = pipeline;
        this.#writeTo = null;
        this.#omitTree = "none";
    }

    omitTree(omit) {
        this.#omitTree = omit;
        return this;
    }

    writeTo(path) {
        this.#writeTo = path;
        return this;
    }

    run() {
        const results = this.#runTestCase("");
        this.#printResults(results);
    }

    #printResultsTree(head, results, prefix = "", headPrefix = "") {
        const info = results.failed === 0? "Pass" : `Failed ${results.failed} out of ${results.total} tests`;
        println(`${headPrefix}${head} (${info})`);

        if (this.#omitTree === "passedChildren" && results.failed === 0) {
            return;
        }

        let content = [...results.content];
        if (this.#omitTree === "passed") {
            content = content
                .filter(
                    ([_, r]) => (r.type === "testcase" && r.failed > 0) || (r.type === "test" && r.result !== "Pass")
                );
        }
        let countdown = content.length;

        for (const [name, subresults] of content) {
            countdown -= 1;
            println(prefix + "|");
            if (subresults.type === "testcase") {
                const newPrefix = countdown === 0? "     " : "|    ";
                this.#printResultsTree(name, subresults, prefix + newPrefix, prefix + "+--> ");
            } else {
                println(`${prefix}+--> ${name} (${subresults.result})`); // TODO maybe print more context
            }
        }
    }

    #printResults(results) {
        println("\n\n========== Test results: ==========");
        this.#printResultsTree(".", results);
    }

    #addFolderToClava(basePath, relativePath="") {
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
    #getGlobalTestUtilsPragma(...subcommands) {
        const matches = [];
        
        for (const $pragma of Query.search("pragma")) {
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

    #getErrorClass(error) {
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

    #runTest(path, isOkExpected = true, singleFile = false) {
        Clava.pushAst();

        this.#addFolderToClava(path);

        // TODO is there a way to temporarily redirect stdout to a file?
        // setPrintStream(this.#writeTo + "/" + "/log.txt");

        const result = { type: "test", expectedExceptions: [], actualException: null };
        let pass = isOkExpected;

        try {
            Clava.rebuild();

            if (!isOkExpected) {
                for (const $pragma of this.#getGlobalTestUtilsPragma("expect")) {
                    result.expectedExceptions.push(this.#getErrorClass($pragma.content[1]));
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
            if (!(e instanceof CoralError)) {
                // throw e;
                print(e.stack)
            }

            result.actualException = e;
            pass = !isOkExpected && result.expectedExceptions.some((error) => e instanceof error);
            if (!pass) {
                if (this.#writeTo === null) {
                    println(e.stack);
                } else {
                    let writeTo = this.#writeTo + "/" + path + ".log.txt";
                    writeFile(writeTo, e.stack);
                }
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

    isOkExpected(subpathParts) {
        if (subpathParts[1] === "ok") {
            return true;
        } else if (subpathParts[1] === "err") {
            return false;
        } else {
            throw new Error("Invalid test type: " + subpathParts[1]);
        }
    }

    #runTestCase(path) {
        const results = {
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
                    const result = this.#runTest(path + "/" + subpath.getName(), this.isOkExpected(subpathParts));
                    results.content.set(testName, result);
                    result.result === "Pass" ? results.passed += 1 : results.failed += 1;
                    results.total += 1;
                }
            } else if (Io.isFile(subpath)) {
                const result = this.#runTest(path + "/" + subpath.getName(), this.isOkExpected(subpathParts), true);
                results.content.set(testName, result);
                result.result === "Pass" ? results.passed += 1 : results.failed += 1;
                results.total += 1;
            }
        }
        return results;
    }
}

const rootFolder = Clava.getData().getContextFolder() + "/..";
const testFolder = rootFolder + "/in/test";
new CoralTester(testFolder, new CoralPipeline())
    .writeTo(rootFolder + "/out/woven_code/test")
    .omitTree("passed")
    .run();

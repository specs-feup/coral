laraImport("clava.Clava");
laraImport("clava.ClavaJoinPoints");
laraImport("lara.Io");
laraImport("weaver.Query");

laraImport("coral.CoralPipeline");
laraImport("coral.error.CoralError");

class CoralTester {
    #baseFolder;
    #pipeline;
    #writeTo;
    #omitTree;

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

    #runTest(path, expectedExceptions=null, singleFile=false) {
        Clava.pushAst();

        this.#addFolderToClava(path);

        // TODO is there a way to temporarily redirect stdout to a file?
        // setPrintStream(this.#writeTo + "/" + "/log.txt");

        const result = { type: "test", expectedExceptions, actualException: null };
        let ok = (expectedExceptions === null || expectedExceptions.length === 0);
        try {
            Clava.rebuild();
            this.#pipeline.apply();
            if (this.#writeTo !== null) {
                let writeTo = this.#writeTo + "/" + path;
                if (singleFile) {
                    writeTo += "/..";
                }
                Clava.writeCode(writeTo);
            }
        } catch (e) {
            result.actualException = e;
            ok = (expectedExceptions !== null && expectedExceptions.some(c => e instanceof c));
            if (!ok) {
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

        if (ok) {
            result.result = "Pass";
        } else {
            result.result = "Fail";
        }
        
        return result;
    }

    #getTestType(subpathParts) {
        if (subpathParts[1] === "ok") {
            return [];
        } else if (subpathParts[1] === "err") {
            return [CoralError];
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
                    const result = this.#runTest(path + "/" + subpath.getName(), this.#getTestType(subpathParts));
                    results.content.set(testName, result);
                    result.result === "Pass" ? results.passed += 1 : results.failed += 1;
                    results.total += 1;
                }
            } else if (Io.isFile(subpath)) {
                const result = this.#runTest(path + "/" + subpath.getName(), this.#getTestType(subpathParts), true);
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

laraImport("clava.Clava");
laraImport("clava.ClavaJoinPoints");
laraImport("lara.Query");

laraImport("coral.CoralPipeline");
laraImport("coral.errors.CoralError");

class CoralTester {

    rootFolder;

    constructor() {
        this.rootFolder = Clava.getData().getContextFolder();
    }


    /**
     * 
     * @param {*} path 
     */
    #innerTest(path) {
        const $file = ClavaJoinPoints.file(this.rootFolder + path);
        Query.root().setFirstChild($file);
        Clava.rebuildAst();

        // Inner test
        const pipeline = new CoralPipeline();
        pipeline.apply();
    }

    /**
     * Pseudo-decorator for test functions
     * @param {*} file 
     * @param {*} expectedExceptions 
     * @returns 
     */
    #testImpl(path, expectedExceptions = undefined) {
        Clava.pushAst();

        try {
            this.#innerTest(path);
        } catch(e) {
            if (expectedExceptions?.some(c => e instanceof c)) {
                Clava.popAst();
                return true;
            }

            Clava.popAst();
            return false;
        }

        Clava.popAst();
        return expectedExceptions === undefined;
    }

    /**
     * 
     * @param {str} file 
     */
    test(file) {
        this.#testImpl("/accepted/" + file);
    }
    
    /**
     * 
     * @param {str} file
     * @param {Array} expectedExceptions
     * @returns {boolean} True if the test threw an exception
     */
    expectedException(file, expectedExceptions) {
        return this.#testImpl("/error/" + file, expectedExceptions);
    }

}



const accept = [
    "borrow_simple.c",
    "elision.c",
    "nll.c",
    "simple_copy_trait.c"
];
const fail =  [
    "borrow_of_moved_value.c",
    "moved_while_borrowed.c",
    "mutable_borrow_of_const.c",
    "used_after_move.c"
];
const tester = new CoralTester();

for (const file of accept) {
    tester.test(file);
}

for (const file of fail) {
    tester.expectedException(file, [CoralError]);
}

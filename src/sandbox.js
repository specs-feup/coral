laraImport("coral.CoralPipeline");

laraImport("weaver.Query");
println(Query.root().dump + "\n\n")

const pipeline = new CoralPipeline()
    .debug();

try {
    pipeline.apply(); 
} catch (e) {
    if (e instanceof CoralError) {
        println(e.message);
    } else {
        throw e;
    }
}

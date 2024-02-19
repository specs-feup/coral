laraImport("coral.CoralPipeline");

laraImport("weaver.Query");
println(Query.root().dump + "\n\n")

new CoralPipeline()
    .apply();

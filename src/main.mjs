import CoralPipeline from "../coral/CoralPipeline.js";

try {
    const pipeline = new CoralPipeline();
    pipeline.apply();
} catch (e) {
    console.error(e);
}

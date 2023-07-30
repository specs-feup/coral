laraImport("lara.pass.SimplePass");
laraImport("lara.pass.results.PassResult");
laraImport("lara.pass.PassTransformationError.js");

laraImport("clava.coral.lifetimes.FnLifetimes");
laraImport("clava.coral.errors.CoralError");

/**
 * Infers which variables can be safely set as const, that are reachable from the given join point.
 *
 * E.g. transforms int i = 0; into const int i = 0;
 *
 * Does not support variables that are arrays, in those cases the code stays unchanged.
 */
class LifetimeElision extends SimplePass {
// TODO: Add support for methods

  /**
   * @return {string} Name of the pass
   * @override
   */
  get name() {
    return "LifetimeElision";
  }

  
  matchJoinpoint($jp) {
    if (! $jp.instanceOf("function") )
      return false;
  }

  transformJoinpoint($jp) {
    let fnLifetimes;
    try {
      fnLifetimes = new FnLifetimes($jp);
    } catch (e) {
      if (e instanceof CoralError) {
        throw new PassTransformationError(this, $jp, e.message);
      } else {
        throw e;
      }
    }


    this.#elision(fnLifetimes);
    
    return new PassResult(this, $jp);
  }

  #isDefinitionIllegal(fnLifetimes) {
    if (fnLifetimes.references == 0) {
      // TODO: logic
      fnLifetimes
    }
  }

  #elision(lifetimes) {

  }

}
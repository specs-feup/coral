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
    let lf;
    try {
      lf = new FnLifetimes($jp);
    } catch (e) {
      if (e instanceof CoralError) {
        throw new PassTransformationError(this, $jp, e.message);
      } else {
        throw e;
      }
    }


    if (this.#isValid(lf))
    this.#elision(lf);
    
    return new PassResult(this, $jp);
  }

  /**
   * 
   * @param {FnLifetimes} lf
   * @returns {boolean} True if the lifetime definition is illegal 
   */
  #isDefinitionIllegal(lf) {
    // TODO: Convert to multiple exceptions with meaningful messages
    
    return lf.hasOutputReference && (
      // No parameters to infer from.
      lf.inputs === 0 ||

      // Borrows from a non-input lifetime
      !lf.inLifetimes.some(e => e.at(1) === lf.outLifetime) ||

      // Cannot infer, ambiguous which parameter it borrowed from
      ( !lf.hasOutput && lf.inputs > 1 )
    )
  }

  /**
   * 
   * @param {FnLifetimes} lf 
   * @returns {boolean} True if the lifetime is valid 
   */
  #isValid(lf) {

  }

  /**
   * Infers the required lifetimes or returns false if the lifetime definition is illegal
   * @param {*} lf 
   * @returns {boolean} True if the lifetime definition is valid
   */
  #elision(lf) {
    if (this.#isValid(lf))
      return true;
    if (this.#isDefinitionIllegal(lf))
      return false;

    // Auto-fill the required lifetimes
    for (let lifetime of lf.lifetimes) {
      if (life) {

      }
    }

    return true;
  }

}

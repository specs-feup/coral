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
    return $jp.instanceOf("function");
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


    if (this.#isAlreadyValid(lf)) {
      return new PassResult(this, $jp, { appliedPass: false });
    }

    this.#checkIllegalDefinition(lf);

    this.#elision(lf);
    
    return new PassResult(this, $jp);
  }


  /**
   * 
   * @param {FnLifetimes} lf
   * @returns {boolean} True if the lifetime definition is illegal 
   */
  #checkIllegalDefinition(lf) {    
    if (!lf.hasOutputReference)
      return;
    
    if (lf.inputLfs === 0)
      throw new PassTransformationError(this, $jp, "No parameters to infer the return from");

    if (!lf.inLifetimes.some(e => e.at(1) === lf.outLifetime))
      throw new PassTransformationError(this, $jp, "Return borrows from a non-input lifetime");

    if (!lf.hasOutputLf && lf.inputLfs > 1)
      throw new PassTransformationError(this, $jp, "Cannot infer lifetimes, it is ambiguous which parameter the return is borrowed from");
  }

  /**
   * 
   * @param {FnLifetimes} lf 
   * @returns {boolean} True if the lifetime is valid 
   */
  #isAlreadyValid(lf) {
    if (lf.hasOutputLf)
      return true;
  }

  /**
   * Infers the required lifetimes or returns false if the lifetime definition is illegal
   * @param {*} lf 
   * @returns {boolean} True if the lifetime definition is valid
   */
  #elision(lf) {
    if (this.#checkIllegalDefinition(lf))
      return false;

    // Auto-fill the required lifetimes
    for (let lifetime of lf.lifetimes) {
      if (life) {
        
      }
    }

    return true;
  }

}

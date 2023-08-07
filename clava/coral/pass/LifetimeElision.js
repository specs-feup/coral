laraImport("lara.pass.SimplePass");
laraImport("lara.pass.results.PassResult");
laraImport("lara.pass.PassTransformationError");

laraImport("clava.coral.lifetimes.FnLifetimes");
laraImport("clava.coral.errors.CoralError");

/**
 * Performs lifetime elision on every function declaration
 * Detects illegal definitions and throws CoralError when found
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

    this.#checkIllegalDefinition(lf, $jp);

    this.#elision(lf);
    lf.overwritePragmas();
    
    return new PassResult(this, $jp);
  }


  /**
   * 
   * @param {FnLifetimes} lf
   * @param {JoinPoint} $jp
   * @returns {boolean} True if the lifetime definition is illegal 
   */
  #checkIllegalDefinition(lf, $jp) {
    if (lf.hasOutputLf && !lf.hasOutputReference)
      throw new PassTransformationError(this, $jp, "Non-reference objects cannot have lifetimes");
    
    const incorrectIns = [];
    for (const p of lf.$jp.params) {
      if (!CoralUtils.isReference(p.type) && lf.inLifetimes.some(e => e.at(0) === p.name)) {
        incorrectIns.push(p.name);
      }
    }
    if (incorrectIns.length > 0)
      throw new PassTransformationError(this, $jp, `Lifetime(s) in non-reference object(s) ${incorrectIns.join(', ')}`);

    // Remaining errors only apply if there is an output reference
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
    // Function does not require lifetimes
    if (!lf.hasOutputReference && !lf.inReferences === 0)
      return true;

    // TODO: Test if output reference comes from the correct param
    // Tests if the output lifetime is already defined and matches one of the inputs
    if (
      lf.hasOutputReference &&
      lf.hasOutputLf &&
      lf.inLifetimes.some(e => e.at(1) === lf.outLifetime)
    ) {
      return true;
    }
  }


  /**
   * Infers the required lifetimes or returns false if the lifetime definition is illegal
   * @param {*} lf 
   */
  #elision(lf) {
    // Auto-fill the required lifetimes
    for (let life of lf.lifetimes) {
      if (life) {
        
      }
    }

  }

}

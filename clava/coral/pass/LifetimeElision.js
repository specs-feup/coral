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

    // Only apply the pass if the function requires lifetimes
    if (!this.#requiresLifetimes(lf)) {
      return new PassResult(this, $jp, { appliedPass: false });
    }

    // Only uniformize lifetime pragmas
    if (this.#isAlreadyValid(lf)) {
      lf.overwritePragmas();
      return new PassResult(this, $jp, { appliedPass: false });
    }

    this.#checkIllegalDefinition(lf, $jp);

    this.#elision(lf, $jp);
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
    
    if (lf.insReferences === 0)
      throw new PassTransformationError(this, $jp, "No parameters to infer the return from");

    if (lf.hasOutputLf && !lf.inLifetimes.some(e => e.at(1) === lf.outLifetime))
      throw new PassTransformationError(this, $jp, "Return borrows from a non-input lifetime");

    if (!lf.hasOutputLf && lf.inputLfs > 1)
      throw new PassTransformationError(this, $jp, "Cannot infer lifetimes, it is ambiguous which parameter the return is borrowed from");
  }


  /**
   * Returns wether the function requires lifetimes
   * @param {*} lf 
   * @returns {boolean} True if the function requires lifetimes
   */
  #requiresLifetimes(lf) {
    return lf.hasOutputReference || lf.inReferences > 0;
  }

  /**
   * 
   * @param {FnLifetimes} lf 
   * @returns {boolean} True if the lifetime is valid 
   */
  #isAlreadyValid(lf) {
    // TODO: Test if output reference comes from the correct param
    // Tests if the output lifetime is already defined and matches one of the inputs
    return lf.inReferences === lf.inputLfs &&
    (
      !lf.hasOutputReference || (
        lf.hasOutputLf &&
        lf.inLifetimes.some(e => e.at(1) === lf.outLifetime)
      )
    );
  }


  /**
   * Infers the required lifetimes or returns false if the lifetime definition is illegal
   * @param {*} lf 
   */
  #elision(lf, $jp) {
    // TODO: Handle methods rule
    // TODO: Generate multiple UNIQUE lifetimes
    // Auto-fill the required lifetimes
    if (lf.inReferences === 1) {
      // Only one input reference, it must be the output
      const param = $jp.params.find(p => CoralUtils.isReference(p.type));
      let inLf = lf.inLifetimes.find(e => e.at(0) == param);

      if (inLf === undefined) {
        let tmpInLft = lf.inLifetimes;
        inLf = [param.name, "%auto"];
        tmpInLft.push(inLf);
        lf.inLifetimes = tmpInLft;
      }
      
      if (lf.hasOutputReference)
        lf.outLifetime = inLf.at(1);
      return;
    }

  }

}

import SimplePass from "lara-js/api/lara/pass/SimplePass.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";

import FnLifetimes from "../lifetimes/FnLifetimes.js";


/**
 * Performs lifetime elision on every function declaration
 * Detects illegal definitions and throws CoralError when found
 */
export default class LifetimeElision extends SimplePass {
// TODO:  Expand for elaborated types
  

  /**
   * @return {string} Name of the pass
   * @override
   */
  get name() {
    return "LifetimeElision";
  }

  /**
   * 
   * @param {JoinPoint} $jp 
   * @returns {boolean}
   */
  matchJoinpoint($jp) {
    return $jp.instanceOf("function");
  }

  /**
   * 
   * @param {JoinPoint} $jp 
   * @returns {PassResult}
   */
  transformJoinpoint($jp) {
    let fnLf;
    try {
      fnLf = new FnLifetimes($jp);
    } catch (e) {
        throw e;
    }

    this.#addMissingLifetimes(fnLf, $jp);
    this.#elision(fnLf, $jp);
    fnLf.overwritePragmas();

    return new PassResult(this, $jp);
  }

  /**
   * 
   * @param {FnLifetimes} fnLf 
   * @param {JoinPoint} $jp 
   */
  #addMissingLifetimes(fnLf, $jp) {
    const nameGenerator = CoralUtils.uniqueNameGenerator();

    for (const $param of $jp.params) {
      if (CoralUtils.isReference($param.type) && !fnLf.paramLifetimes.has($param.name)) {
        // No lifetimes defined for this parameter, add them
        let name = nameGenerator.next().value;
        while (fnLf.declaredParamLifetimes.includes(name)) {
          name = nameGenerator.next().value;
        }
        fnLf.setParamLifetimes($param.name, [name]);
      }
    }

    if (CoralUtils.isReference($jp.returnType) && fnLf.returnLifetimes.length === 0) {
      // No lifetimes defined for the return, add them
      let name = nameGenerator.next().value;
      while (fnLf.declaredParamLifetimes.includes(name)) {
        name = nameGenerator.next().value;
      }
      fnLf.setReturnLifetimes([name]);
    }
  }

  #elision(fnLf, $jp) {
    if (fnLf.returnLifetimes.length === 1 && fnLf.declaredParamLifetimes.length === 1) {
      // Only one lifetime, it must be the same
      fnLf.setReturnLifetimes([...fnLf.declaredParamLifetimes]);
    }

    // TODO: Add method rules
  }
}

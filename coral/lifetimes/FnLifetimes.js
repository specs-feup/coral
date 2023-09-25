laraImport("coral.errors.CoralError");
laraImport("coral.CoralUtils");

class FnLifetimes {

  /**
   * @type {JoinPoint}
   */
  $function;
  /**
   * @type {String[]}
   */
  returnLifetimes;
  /**
   * @type {Map<String, String[]>}
   */
  paramLifetimes;

  #declaredLifetimes;
  #declaredParamLifetimes;

  constructor($function) {
    this.$function = $function;
    this.returnLifetimes = [];
    this.paramLifetimes = new Map();
    this.#parsePragmas();
  }

  /**
   * @returns {Array} Array of $pragmas joinpoints related to the function's lifetimes
   */
  get pragmas() {
    return this.$function.pragmas.filter( p =>
      p.name === "coral_lf"
    );
  }

  get declaredParamLifetimes() {
    if (this.#declaredParamLifetimes === undefined) {
      const _declaredParamLifetimes = new Set();

      for (const lfs of this.paramLifetimes.values())
        for (const lf of lfs)
        _declaredParamLifetimes.add(lf);

      this.#declaredParamLifetimes = Array.from(_declaredParamLifetimes).sort();
    }

    return this.#declaredParamLifetimes;
  }

  get declaredLifetimes() {
    if (this.#declaredLifetimes === undefined) {
      const _declaredLifetimes = new Set();

      for (const lfs of this.paramLifetimes.values())
        for (const lf of lfs)
          _declaredLifetimes.add(lf);
      
      for (const lf of this.returnLifetimes)
        _declaredLifetimes.add(lf);

      this.#declaredLifetimes = Array.from(_declaredLifetimes).sort();
    }

    return this.#declaredLifetimes;
  }

  get requiresReturnLifetimes() {
    // TODO: Elaborated types
    return this.$function.returnType.isPointer;
  }

  /**
   * 
   * @param {string[]} lfs 
   */
  setReturnLifetimes(lfs) {
    this.returnLifetimes = lfs;
    this.#declaredLifetimes = undefined;
  }

  /**
   * @param {string} name
   * @param {string[]} lfs 
   */
  setParamLifetimes(name, lfs) {
    this.paramLifetimes.set(name, lfs);
    this.#declaredLifetimes = undefined;
    this.#declaredParamLifetimes = undefined;
  }

  /**
   * Parses pragmas and sets the lifetimes
   */
  #parsePragmas() {
    for (const p of this.pragmas) {
      let content = p.content.split(' ');
      let target;
      if (content[0].startsWith('%')) {
        // Return lifetime
        if (this.$function.returnType.isVoid) {
          throw new CoralError("Cannot have return lifetimes on void function");
        }
        if (this.returnLifetimes.length !== 0) {
          throw new CoralError("Multiple lifetime definitions for return value");
        }
      } else {
        // Parameter lifetime
        target = content[0];
        if (!this.$function.params.some(e => e.name === target)) {
          throw new CoralError(`Unknown parameter ${target}`);
        }
        // TODO: Check if param requires lifetimes
        if (this.paramLifetimes.has(target)) {
          throw new CoralError(`Multiple lifetime definitions for parameter ${target}`);
        }
        content = content.slice(1);
      }

      // Lifetimes
      const lfs = [];
      for (const lf of content) {
        // Remove the leading %
        lfs.push(lf.slice(1));
      }

      if (target === undefined) {
        this.returnLifetimes = lfs;
      } else {
        this.paramLifetimes.set(target, lfs);
      }
    }

    if (!this.#isReturnLifetimeFromParams()) {
      throw new CoralError("Every return type lifetime must come from a parameter");
    }
  }

  /**
   * 
   * @returns {boolean} True if every return lifetime is defined in a parameter
   */
  #isReturnLifetimeFromParams() {
    return this.returnLifetimes.every((e) => this.declaredParamLifetimes.includes(e));
  }

  /**
   * Overwrites the pragmas of the function with the new lifetimes
   */
  overwritePragmas() {
    const toDetatch = this.pragmas;
    for (let p of toDetatch) {
      p.detach();
    }

    for (const [name, lf] of this.paramLifetimes.entries()) {
      this.$function.insertBefore(`#pragma coral_lf ${name} ${lf.map(e => "%" + e).join(" ")}`);
    }

    if (this.returnLifetimes.length > 0) {
      this.$function.insertBefore(`#pragma coral_lf % ${this.returnLifetimes.map(e => "%" + e).join(" ")}`);
    }
  }
}

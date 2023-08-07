laraImport("clava.coral.errors.CoralError");
laraImport("clava.coral.CoralUtils");

class FnLifetimes {

  $jp;
  #inLifetimes;
  #outLifetime;

  #inReferences;
  #hasOutputReference;

  constructor($function) {
    this.$jp = $function;
    this.#parsePragmas();

    this.#hasOutputReference = CoralUtils.isReference($function.returnType);
  }

  /**
   * @returns {JoinPoint} Joinpoint of the function
   */
  get $function() {
    return $jp;
  }

  /**
   * @returns {Array} Array of $pragmas joinpoints related to the function's lifetimes
   */
  get pragmas() {
    return this.$jp.pragmas.filter( p =>
      p.name === "coral" &&
      p.content.startsWith("lft ")
    );
  }

  /**
   * @return {Array} Array of pairs lifetimes and their names, or undefined in the case of the output lifetime
   */
  get lifetimes() {
    return [...this.#inLifetimes, (undefined, this.#outLifetime)];
  }

  /**
   * @return {Array} Array of pairs of parameter names and their lifetimes
   */
  get inLifetimes() {
    return [...this.#inLifetimes];
  }

  /**
   * @param {Array} lfs Array of pairs of parameter names and their lifetimes
   */
  set inLifetimes(lfs) {
    this.#inLifetimes = [...lfs];
  }

  /**
   * @return {string} Output lifetime
   */
  get outLifetime() {
    return this.#outLifetime;
  }

  /**
   * @param {string} lf Output lifetime
   */
  set outLifetime(lf) {
    this.#outLifetime = lf;
  }

  /**
   * @return {number} Number of input lifetimes
   */
  get inputLfs() {
    return this.#inLifetimes.length;
  }

  /**
   * @return {bool} True if the function has an output lifetime 
   */
  get hasOutputLf() {
    return this.#outLifetime !== undefined;
  }

  /**
   * @return {bool} True if the function has an output reference 
   */
  get hasOutputReference() {
    return this.#hasOutputReference;
  }

  /**
   * @return {number} Number of references to pointers in the function
   */
  get inReferences() {
    if (this.#inReferences === undefined) {    
      this.#inReferences = 0;
      for (const $param of this.$jp.params) {
        if (CoralUtils.isReference($param.type))
          this.#inReferences++;
      }
    }

    return this.#inReferences;
  }


  /**
   * Parses pragmas and sets the lifetimes
   */
  #parsePragmas() {
    this.#inLifetimes = [];
    this.#outLifetime = undefined;

    for (const p of this.pragmas) {
      const iter = p.content.split(' ').slice(1);

      for (let i = 0; i < iter.length; i++) {
        const arg = iter.at(i);
        if (arg.startsWith('%')) {
          // Output lifetime
          if (this.#outLifetime !== undefined)
              throw new CoralError("Multiple output lifetimes defined");
          this.#outLifetime = arg;
        } else {
          // Named lifetime
          if (this.#inLifetimes.some(e => e.at(0) === arg))
              throw new CoralError(`Multiple lifetime definitions for parameter ${arg}`);
          this.#inLifetimes.push([arg, iter.at(++i)]);
        }
      }

    }

  }

  /**
   * Overwrites the pragmas of the function with the new lifetimes
   */
  overwritePragmas() {
    const toDetatch = this.pragmas;
    for (let p of toDetatch) {
      p.detach();
    }

    let content = "#pragma coral lft";

    for (const [name, lf] of this.#inLifetimes) {
      content += ` ${name} ${lf}`;
    }

    if (this.#outLifetime !== undefined)
      content += ' ' + this.#outLifetime;

    this.$jp.insertBefore(content);
  }

}
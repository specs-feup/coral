laraImport("clava.coral.errors.CoralError");

class FnLifetimes {

  $jp;
  #inLifetimes;
  #outLifetime;

  #inReferences;
  #hasOutputReference;

  constructor($function) {
    this.$jp = $function;
    this.#parsePragmas();

    this.#hasOutput = CoralUtils.isReference($function.returnType);
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
    return [...this.#inLifetimes, (this.#outLifetime, undefined)];
  }

  /**
   * @return {Array} Array of pairs of parameter names and their lifetimes
   */
  get inLifetimes() {
    return [...this.#inLifetimes];
  }

  /**
   * @return {string} Output lifetime
   */
  get outLifetime() {
    return this.#outLifetime;
  }

  /**
   * @return {number} Number of input lifetimes
   */
  get inputLfs() {
    return this.#inLifetimes.lenght();
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
    this.outLifetime = undefined;

    for (const p of this.pragmas) {
      const iter = p.content.split(' ').slice(1);

      for (let i = 0; i < iter.lenght(); i++) {
        const arg = iter.at(i);
        if (arg.startsWith('%')) {
          // Output lifetime
          if (this.#outLifetime !== undefined)
              throw new CoralError("Multiple output lifetimes defined");
          this.outLifetime = arg;
        } else {
          // Named lifetime
          if (this.lifetimePairs.some(e => e.at(0) === arg))
              throw new CoralError(`Multiple lifetime definitions for parameter ${arg}`);
          this.lifetimePairs.push([arg, iter.at(++i)]);
        }
      }

    }

  }

  /**
   * Overwrites the pragmas of the function with the new lifetimes
   */
  overwriteFnLifetimePragmas() {
    const toDetatch = this.pragmas;
    for (let p of toDetatch) {
      p.detach();
    }

    let content = "#pragma coral ";
    content += this.#inLifetimes.join(' ');
    content += ' ' + this.#outLifetime;

    this.$jp.insertBefore(content);
  }

}
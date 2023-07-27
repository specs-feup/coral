laraImport("clava.coral.errors.CoralError");

class FnLifetimes {

  $jp;
  inLifetimes;
  outLifetime;

  #references;

  constructor($function) {
    this.$jp = $function;
    this.#parsePragmas();
  }

  get $function() {
    return $jp;
  }

  get pragmas() {
    return this.$jp.pragmas.filter( p =>
      p.name === "coral" &&
      p.content.startsWith("lft ")
    );
  }

  get lifetimes() {
    return [...this.inLifetimes, this.outLifetime];
  }

  get inputs() {
    return this.inLifetimes.lenght();
  }

  get hasOutput() {
    return this.outLifetime === undefined;
  }

  get references() {
    if (this.#references === undefined) {    
      this.#references = 0;
      for (const $param of this.$jp.params) {
        if ($param.definition.isPointer)
          this.#references++;
      }
    }

    return this.#references;
  }

  #parsePragmas() {
    this.inLifetimes = [];
    this.outLifetime = undefined;

    for (const p of this.pragmas) {
      const iter = p.content.split(' ').slice(1);

      for (let i = 0; i < iter.lenght(); i++) {
        const arg = iter.at(i);
        if (arg.startsWith('%')) {
          // Output lifetime
          if (this.outLifetime !== undefined)
              throw new CoralError("Multiple output lifetimes defined");
          this.outLifetime = arg;
        } else {
          // Named lifetime
          if (this.lifetimes.some(e => e.at(0) === arg))
              throw new CoralError(`Multiple lifetime definitions for parameter ${arg}`);
          this.lifetimes.push([arg, iter.at(++i)]);
        }
      }

    }

  }

  overwriteFnLifetimePragmas() {
    const toDetatch = this.pragmas;
    for (let p of toDetatch) {
      p.detach();
    }

    let content = "#pragma coral ";
    content += this.inLifetimes.join(' ');
    content += ' ' + this.outLifetime;

    this.$jp.insertBefore(content);
  }

}
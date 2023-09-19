class Ty {

    name;
    lifetimes;
    isConst;

    constructor(name, isConst=false, lifetimes=[]) {
        this.name = name;
        this.isConst = isConst;
        this.lifetimes = lifetimes;
    }

    equals(other) {
        return this.name === other.name && this.isConst === other.isConst && this.lifetimes.equals(other.lifetimes);
    }

    /**
     * @returns string
     */
    toString() {
        return this.lifetimes.size > 0 ? this.name + "<" + this.lifetimes.join(", ") + ">" : this.name;
    }

    get requiresLifetimes() {
        return this.lifetimes.size > 0;
    } 
}
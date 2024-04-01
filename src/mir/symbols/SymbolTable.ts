import Declaration from "coral/mir/Declaration";
import Symbol from "coral/mir/symbols/Symbol";


class SymbolTable {
    #symbols: Map<string, Symbol[]>;
    #scopeStack: Symbol[][];
    #loopStack: number[];

    constructor() {
        this.#symbols = new Map();
        this.#scopeStack = [];
        this.#loopStack = [];
    }

    static merge(tables: SymbolTable[]): SymbolTable { }
    
    clone(): SymbolTable { }

    applyAccess(access: Access) { }

    pushSymbol(declaration: Declaration) {
        const symbol = new Symbol(declaration.$jp, declaration.ty);

        if (!this.#symbols.has(declaration.name)) {
            this.#symbols.set(declaration.name, []);
        }

        this.#symbols.get(declaration.name)!.push(symbol);
        this.#scopeStack[this.#scopeStack.length - 1].push(symbol);
    }

    pushScope() {
        this.#scopeStack.push([]);
        if (this.#loopStack.length > 0) {
            this.#loopStack[this.#loopStack.length - 1] += 1;
        }
    }

    pushLoop() {
        this.#loopStack.push(0);
    }

    popScope(): Symbol[] {
        const symbols = this.#scopeStack.pop();
        if (symbols === undefined) {
            throw new Error("SymbolTable: popScope called on empty scope stack");
        }
        for (const symbol of symbols) {
            this.#symbols.get(symbol.name)!.pop();
        }
        if (this.#loopStack.length > 0) {
            if (this.#loopStack[this.#loopStack.length - 1] === 0) {
                this.#loopStack.pop();
            } else {
                this.#loopStack[this.#loopStack.length - 1] -= 1;
            }
        }
        return symbols;
    }
}

export default SymbolTable;

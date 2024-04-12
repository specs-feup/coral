import { Vardecl } from "clava-js/api/Joinpoints.js";
import CoralError from "coral/error/CoralError";
import Access from "coral/mir/Access";
import Path from "coral/mir/path/Path";
import PathDeref from "coral/mir/path/PathDeref";
import PathVarRef from "coral/mir/path/PathVarRef";

class MoveTable {
    #states: Map<string, MoveTable.State>;
    #vardecls: Map<string, Vardecl>;

    constructor() {
        this.#states = new Map();
        this.#vardecls = new Map();
    }

    get($vardecl: Vardecl): MoveTable.State {
        return this.#states.get($vardecl.astId) ?? MoveTable.State.UNINIT;
    }

    getVars(state: MoveTable.State): Vardecl[] {
        return Array.from(this.#states.entries())
            .filter(([, value]) => value === state)
            .map(([key]) => this.#vardecls.get(key)!);
    }

    enterScope(vardecls: Vardecl[]): void {
        for (const $vardecl of vardecls) {
            if (!this.#states.has($vardecl.astId)) {
                this.#states.set($vardecl.astId, MoveTable.State.UNINIT);
                this.#vardecls.set($vardecl.astId, $vardecl);
            }
        }
    }

    enterParams(vardecls: Vardecl[]): void {
        for (const $vardecl of vardecls) {
            this.#states.set($vardecl.astId, MoveTable.State.VALID);
            this.#vardecls.set($vardecl.astId, $vardecl);
        }
    }

    updateAccess(access: Access): void {
        const path = access.path;
        // PathDeref does not change the state of the variable
        if (path instanceof PathVarRef) {
            switch (access.mutability) {
                case Access.Mutability.READ:
                case Access.Mutability.BORROW:
                case Access.Mutability.MUTABLE_BORROW: {
                    const state = this.#states.get(path.$vardecl.astId);
                    if (state === MoveTable.State.VALID) {
                        if (access.isMove) {
                            this.#states.set(path.$vardecl.astId, MoveTable.State.MOVED);
                        }
                    } else {
                        // TODO ERROR
                        throw new CoralError("TODO ERROR FOR THIS");
                    }
                    break;
                }
                case Access.Mutability.WRITE:
                    this.#states.set(path.$vardecl.astId, MoveTable.State.VALID);
                    break;
                case Access.Mutability.STORAGE_DEAD:
                    this.#states.delete(path.$vardecl.astId);
                    break;
            }
        } else if (path instanceof PathDeref) {
            const state = this.#pathToState(path);
            if (state !== MoveTable.State.VALID) {
                // TODO ERROR
                throw new CoralError("TODO ERROR FOR THIS");
            }
            
            if (access.isMove) {
                // TODO ERROR
                throw new CoralError("TODO ERROR FOR THIS");
            }
        } else {
            throw new Error("Unsupported path type");
        }
    }

    #pathToState(path: Path): MoveTable.State {
        if (path instanceof PathVarRef) {
            return this.get(path.$vardecl);
        } else if (path instanceof PathDeref) {
            return this.#pathToState(path.inner);
        } else {
            throw new Error("Unsupported path type");
        }
    }

    equals(other: MoveTable): boolean {
        if (this.#states.size !== other.#states.size) {
            return false;
        }

        for (const [key, value] of this.#states) {
            if (other.#states.get(key) !== value) {
                return false;
            }
        }

        return true;
    }

    static merge(tables: MoveTable[]) {
        const result = new MoveTable();
        for (const table of tables) {
            for (const [key, value] of table.#states) {
                const currentValue = result.#states.get(key);
                if (currentValue === undefined) {
                    result.#states.set(key, value);
                    result.#vardecls.set(key, table.#vardecls.get(key)!);
                    continue;
                }

                if (currentValue === value) {
                    continue;
                }

                if (
                    currentValue === MoveTable.State.MAYBE_UNINIT ||
                    value === MoveTable.State.MAYBE_UNINIT
                ) {
                    result.#states.set(key, MoveTable.State.MAYBE_UNINIT);
                } else if (
                    currentValue === MoveTable.State.MAYBE_MOVED ||
                    value === MoveTable.State.MAYBE_MOVED
                ) {
                    if (
                        currentValue === MoveTable.State.UNINIT ||
                        value === MoveTable.State.UNINIT
                    ) {
                        result.#states.set(key, MoveTable.State.MAYBE_UNINIT);
                    } else {
                        result.#states.set(key, MoveTable.State.MAYBE_MOVED);
                    }
                } else if (
                    currentValue === MoveTable.State.UNINIT ||
                    value === MoveTable.State.UNINIT
                ) {
                    if (
                        currentValue === MoveTable.State.VALID ||
                        value === MoveTable.State.VALID
                    ) {
                        result.#states.set(key, MoveTable.State.MAYBE_UNINIT);
                    } else {
                        result.#states.set(key, MoveTable.State.UNINIT);
                    }
                } else {
                    result.#states.set(key, MoveTable.State.MAYBE_MOVED);
                }
            }
        }
        return result;
    }
}

namespace MoveTable {
    export enum State {
        UNINIT = "uninitialized",
        VALID = "valid",
        MOVED = "moved",
        MAYBE_MOVED = "maybe moved",
        MAYBE_UNINIT = "maybe uninitialized",
    }
}

export default MoveTable;

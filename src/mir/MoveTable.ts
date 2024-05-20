import { BinaryOp, ExprStmt, FunctionJp, Joinpoint, Vardecl } from "clava-js/api/Joinpoints.js";
import MoveBehindReferenceError from "coral/error/move/MoveBehindReferenceError";
import UseBeforeInitError from "coral/error/move/UseBeforeInitError";
import UseWhileMovedError from "coral/error/move/UseWhileMovedError";
import Access from "coral/mir/Access";
import Path from "coral/mir/path/Path";
import PathDeref from "coral/mir/path/PathDeref";
import PathMemberAccess from "coral/mir/path/PathMemberAccess";
import PathVarRef from "coral/mir/path/PathVarRef";
import StructTy from "coral/mir/ty/StructTy";
import Ty from "coral/mir/ty/Ty";

class MoveTable {
    #states: Map<string, MoveTable.StateHolder>;
    #vardecls: Map<string, Vardecl>;

    constructor() {
        this.#states = new Map();
        this.#vardecls = new Map();
    }

    getVarNames(state: MoveTable.State): string[] {
        let result: string[] = [];
        for (const [key, value] of this.#states) {
            let name = this.#vardecls.get(key)!.name;
            result = result.concat(value.getVarNames(state).map(inner => `${name}${inner}`));
        }
        return result;
    }

    enterVar(
        $vardecl: Vardecl,
        ty: Ty,
        initialState: MoveTable.State = MoveTable.State.UNINIT,
    ): void {
        if (this.#states.has($vardecl.astId)) {
            return;
        }

        this.#vardecls.set($vardecl.astId, $vardecl);

        const state = MoveTable.StateHolder.create($vardecl, ty, initialState);
        this.#states.set($vardecl.astId, state);
    }

    updateAccess(access: Access): void {
        const path = access.path;
        const holder = this.#pathToStateHolder(path);
        const state = holder?.state ?? MoveTable.State.UNINIT;
        const $vardecl = this.#pathToVardecl(path);

        // PathDeref does not change the state of the variable
        if (this.#hasDeref(path)) {
            if (
                state === MoveTable.State.UNINIT ||
                state === MoveTable.State.MAYBE_UNINIT
            ) {
                throw new UseBeforeInitError(path.$jp, $vardecl, access);
            }

            if (
                state === MoveTable.State.MOVED ||
                state === MoveTable.State.MAYBE_MOVED
            ) {
                if (holder === undefined) {
                    throw new Error("State holder not found");
                }

                throw new UseWhileMovedError(
                    path.$jp,
                    $vardecl,
                    access,
                    holder.exampleMoveAccess!,
                );
            }

            if (access.isMove) {
                throw new MoveBehindReferenceError(path.$jp, access);
            }
        } else {
            if (holder === undefined) {
                throw new Error("State holder not found");
            }

            switch (access.mutability) {
                case Access.Mutability.READ:
                case Access.Mutability.BORROW:
                case Access.Mutability.MUTABLE_BORROW: {
                    if (state === MoveTable.State.VALID) {
                        if (access.isMove) {
                            holder.state = MoveTable.State.MOVED;
                            holder.exampleMoveAccess = access;
                        }
                    } else if (
                        state === MoveTable.State.MOVED ||
                        state === MoveTable.State.MAYBE_MOVED
                    ) {
                        throw new UseWhileMovedError(
                            path.$jp,
                            $vardecl,
                            access,
                            holder.exampleMoveAccess!,
                        );
                    } else {
                        throw new UseBeforeInitError(path.$jp, $vardecl, access);
                    }
                    break;
                }
                case Access.Mutability.WRITE:
                    holder.state = MoveTable.State.VALID;
                    break;
                case Access.Mutability.STORAGE_DEAD:
                    this.#states.delete($vardecl.astId);
                    break;
            }
        }
    }

    checkDrop(access: Access): [MoveTable.DropKind, MoveTable.StateHolder?] {
        const path = access.path;
        const holder = this.#pathToStateHolder(path);
        const $vardecl = this.#pathToVardecl(path);

        if (holder === undefined) {
            throw new Error("State holder not found");
        }

        let currentState: MoveTable.StateHolder;
        switch (access.mutability) {
            case Access.Mutability.READ:
                if (access.isMove) {
                    currentState = holder.copy();
                    holder.state = MoveTable.State.MOVED;
                    holder.exampleMoveAccess = access;
                    
                    let $parent = access.path.$jp.parent;
                    while (true) {
                        if ($parent instanceof FunctionJp) {
                            return [MoveTable.DropKind.DROP_AFTER, currentState];
                        } else if ($parent instanceof Vardecl || ($parent instanceof BinaryOp && $parent.isAssignment)) {
                            break;
                        }
                        
                        $parent = $parent.parent;
                    }
                }
                break;
            case Access.Mutability.WRITE:
                currentState = holder.copy();
                holder.state = MoveTable.State.VALID;
                return [MoveTable.DropKind.DROP_BEFORE, currentState];
            case Access.Mutability.STORAGE_DEAD:
                currentState = holder.copy();
                this.#states.delete($vardecl.astId);
                return [MoveTable.DropKind.DROP_BEFORE, currentState];
        }

        return [MoveTable.DropKind.NO_DROP, holder];
    }

    #pathToVardecl(path: Path): Vardecl {
        if (path instanceof PathVarRef) {
            return path.$vardecl;
        } else if (path instanceof PathDeref) {
            return this.#pathToVardecl(path.inner);
        } else if (path instanceof PathMemberAccess) {
            return this.#pathToVardecl(path.inner);
        } else {
            throw new Error("Unsupported path type");
        }
    }

    #pathToStateHolder(path: Path): MoveTable.StateHolder | undefined {
        if (path instanceof PathVarRef) {
            return this.#states.get(path.$vardecl.astId);
        } else if (path instanceof PathDeref) {
            return this.#pathToStateHolder(path.inner);
        } else if (path instanceof PathMemberAccess) {
            const inner = this.#pathToStateHolder(path.inner);
            if (inner instanceof MoveTable.FieldStates) {
                return inner.get(path.fieldName);
            } else {
                return inner;
            }
        } else {
            throw new Error("Unsupported path type");
        }
    }

    #hasDeref(path: Path): boolean {
        if (path instanceof PathDeref) {
            return true;
        } else if (path instanceof PathMemberAccess) {
            return this.#hasDeref(path.inner);
        } else {
            return false;
        }
    }

    equals(other: MoveTable): boolean {
        if (this.#states.size !== other.#states.size) {
            return false;
        }

        for (const [key, value] of this.#states) {
            if (!other.#states.get(key)?.equals(value)) {
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
                    result.#states.set(key, value.copy());
                    result.#vardecls.set(key, table.#vardecls.get(key)!);
                    continue;
                }

                currentValue.mergeWith(value);
            }
        }
        return result;
    }
}

namespace MoveTable {
    export enum DropKind {
        DROP_BEFORE = "drop before",
        DROP_AFTER = "drop after",
        NO_DROP = "no drop",
    }

    export enum State {
        UNINIT = "uninitialized",
        VALID = "valid",
        MOVED = "moved",
        MAYBE_MOVED = "maybe moved",
        MAYBE_UNINIT = "maybe uninitialized",
    }

    export abstract class StateHolder {
        static create(
            $vardecl: Vardecl,
            ty: Ty,
            initialState: MoveTable.State = MoveTable.State.UNINIT,
        ): StateHolder {
            if (
                ty instanceof StructTy &&
                ty.isComplete &&
                ty.dropFunction === undefined
            ) {
                const states = new Map<string, StateHolder>();
                for (const [field, fieldTy] of ty.fields.entries()) {
                    states.set(
                        field,
                        StateHolder.create($vardecl, fieldTy, initialState),
                    );
                }
                return new FieldStates(states);
            } else {
                return new SingleState(initialState);
            }
        }

        abstract getVarNames(state: MoveTable.State): string[];
        abstract set state(state: MoveTable.State);
        abstract get state(): MoveTable.State;
        abstract set exampleMoveAccess(access: Access);
        abstract get exampleMoveAccess(): Access | undefined;
        abstract equals(other: StateHolder): boolean;
        abstract copy(): StateHolder;
        abstract mergeWith(other: StateHolder): void;
    }

    export class SingleState extends StateHolder {
        #state: State;
        #exampleMoveAccess?: Access;

        constructor(state: State) {
            super();
            this.#state = state;
        }

        getVarNames(state: MoveTable.State): string[] {
            return state === this.#state ? [""] : [];
        }

        set state(state: MoveTable.State) {
            this.#state = state;
        }
        
        get state(): MoveTable.State {
            return this.#state;
        }

        set exampleMoveAccess(access: Access) {
            this.#exampleMoveAccess = access;
        }

        get exampleMoveAccess(): Access | undefined {
            return this.#exampleMoveAccess;
        }

        mergeWith(other: StateHolder): void {
            if (!(other instanceof SingleState)) {
                throw new Error("Cannot merge SingleState with FieldStates");
            }
            
            if (this.#state === other.#state) {
                return;
            }

            if (
                this.#state === MoveTable.State.MAYBE_UNINIT ||
                other.#state === MoveTable.State.MAYBE_UNINIT
            ) {
                this.#state = MoveTable.State.MAYBE_UNINIT;
            } else if (
                this.#state === MoveTable.State.MAYBE_MOVED ||
                other.#state === MoveTable.State.MAYBE_MOVED
            ) {
                if (
                    this.#state === MoveTable.State.UNINIT ||
                    other.#state === MoveTable.State.UNINIT
                ) {
                    this.#state = MoveTable.State.MAYBE_UNINIT;
                } else {
                    this.#state = MoveTable.State.MAYBE_MOVED;
                    if (other.#state === MoveTable.State.MAYBE_MOVED) {
                        this.#exampleMoveAccess = other.#exampleMoveAccess;
                    }
                }
            } else if (
                this.#state === MoveTable.State.UNINIT ||
                other.#state === MoveTable.State.UNINIT
            ) {
                if (
                    this.#state === MoveTable.State.VALID ||
                    other.#state === MoveTable.State.VALID
                ) {
                    this.#state = MoveTable.State.MAYBE_UNINIT;
                } else {
                    this.#state = MoveTable.State.UNINIT;
                }
            } else {
                this.#state = MoveTable.State.MAYBE_MOVED;
                if (other.#state === MoveTable.State.MOVED) {
                    this.#exampleMoveAccess = other.#exampleMoveAccess;
                }
            }
        }

        equals(other: StateHolder): boolean {
            if (other instanceof SingleState) {
                return this.#state === other.#state;
            }
            return false;
        }

        copy(): StateHolder {
            const result = new SingleState(this.#state);
            if (
                this.#state === MoveTable.State.MOVED ||
                this.#state === MoveTable.State.MAYBE_MOVED
            ) {
                result.#exampleMoveAccess = this.#exampleMoveAccess;
            }
            return result;
        }
    }

    export class FieldStates extends StateHolder {
        #states: Map<string, StateHolder>;

        constructor(states: Map<string, StateHolder>) {
            super();
            this.#states = states;
        }

        get(field: string): StateHolder {
            const state = this.#states.get(field);
            if (state === undefined) {
                throw new Error(`Field ${field} not found`);
            }
            return state;
        }

        getVarNames(state: MoveTable.State): string[] {
            let result: string[] = [];
            for (const [field, holder] of this.#states) {
                result = result.concat(holder.getVarNames(state).map(inner => `.${field}${inner}`));
            }
            return result;
        }

        set state(state: MoveTable.State) {
            for (const holder of this.#states.values()) {
                holder.state = state;
            }
        }

        get state(): MoveTable.State {
            let result: MoveTable.State | undefined;
            for (const holder of this.#states.values()) {
                if (result === undefined) {
                    result = holder.state;
                    continue;
                }

                switch (holder.state) {
                    case MoveTable.State.UNINIT:
                        if (result !== MoveTable.State.MOVED && result !== MoveTable.State.MAYBE_MOVED) {
                            result = MoveTable.State.UNINIT;
                        }
                        break;
                    case MoveTable.State.VALID:
                        break;
                    case MoveTable.State.MOVED:
                        result = MoveTable.State.MOVED;
                        break;
                    case MoveTable.State.MAYBE_UNINIT:
                        if (result === MoveTable.State.VALID) {
                            result = MoveTable.State.MAYBE_UNINIT;
                        }
                        break;
                    case MoveTable.State.MAYBE_MOVED:
                        if (result !== MoveTable.State.MOVED) {
                            result = MoveTable.State.MAYBE_MOVED;
                        }
                        break;
                }
            }
            return result!;
        }

        set exampleMoveAccess(access: Access) {
            for (const holder of this.#states.values()) {
                holder.exampleMoveAccess = access;
            }
        }

        get exampleMoveAccess(): Access | undefined {
            for (const holder of this.#states.values()) {
                if (holder.exampleMoveAccess !== undefined) {
                    return holder.exampleMoveAccess;
                }
            }
            return undefined;
        }

        mergeWith(other: StateHolder): void {
            if (other instanceof FieldStates) {
                for (const [key, value] of other.#states) {
                    value.mergeWith(this.#states.get(key)!);
                }
            } else {
                throw new Error("Cannot merge FieldStates with SingleState");
            }
        }

        equals(other: StateHolder): boolean {
            if (other instanceof FieldStates) {
                if (this.#states.size !== other.#states.size) {
                    return false;
                }

                for (const [key, value] of this.#states) {
                    if (!other.#states.get(key)?.equals(value)) {
                        return false;
                    }
                }

                return true;
            }
            return false;
        }

        copy(): StateHolder {
            const states = new Map<string, StateHolder>();
            for (const [key, value] of this.#states) {
                states.set(key, value.copy());
            }
            return new FieldStates(states);
        }
    }
}

export default MoveTable;

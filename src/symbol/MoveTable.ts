import {
    BinaryOp,
    FunctionJp,
    Vardecl,
} from "@specs-feup/clava/api/Joinpoints.js";
import MergeInconsistentStructError from "@specs-feup/coral/error/drop/MergeInconsistentStructError";
import WriteFieldOfPotentiallyDroppedTypeError from "@specs-feup/coral/error/drop/WriteFieldOfPotentiallyDroppedTypeError";
import MoveBehindReferenceError from "@specs-feup/coral/error/move/MoveBehindReferenceError";
import UseBeforeInitError from "@specs-feup/coral/error/move/UseBeforeInitError";
import UseWhileMovedError from "@specs-feup/coral/error/move/UseWhileMovedError";
import Access from "@specs-feup/coral/mir/action/Access";
import Path from "@specs-feup/coral/mir/path/Path";
import PathDeref from "@specs-feup/coral/mir/path/PathDeref";
import PathMemberAccess from "@specs-feup/coral/mir/path/PathMemberAccess";
import PathVarRef from "@specs-feup/coral/mir/path/PathVarRef";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import StructTy from "@specs-feup/coral/mir/symbol/ty/StructTy";

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
            result = result.concat(
                value.getVarNames(state).map((inner) => `${name}${inner}`),
            );
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
                throw new UseBeforeInitError(path.jp, $vardecl, access);
            }

            if (
                state === MoveTable.State.MOVED ||
                state === MoveTable.State.MAYBE_MOVED
            ) {
                if (holder === undefined) {
                    throw new Error("State holder not found");
                }

                throw new UseWhileMovedError(
                    path.jp,
                    $vardecl,
                    access,
                    holder.exampleMoveAccess!,
                );
            }

            if (access.isMove) {
                throw new MoveBehindReferenceError(path.jp, access);
            }
        } else {
            if (holder === undefined) {
                throw new Error("State holder not found");
            }

            switch (access.kind) {
                case Access.Kind.READ:
                case Access.Kind.BORROW:
                case Access.Kind.MUTABLE_BORROW: {
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
                            path.jp,
                            $vardecl,
                            access,
                            holder.exampleMoveAccess!,
                        );
                    } else {
                        throw new UseBeforeInitError(path.jp, $vardecl, access);
                    }
                    break;
                }
                case Access.Kind.WRITE:
                    holder.state = MoveTable.State.VALID;
                    break;
                case Access.Kind.STORAGE_DEAD:
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
        switch (access.kind) {
            case Access.Kind.READ:
                if (access.isMove) {
                    currentState = holder.copy();
                    holder.state = MoveTable.State.MOVED;
                    holder.exampleMoveAccess = access;

                    let $parent = access.path.jp.parent;
                    while (true) {
                        if ($parent instanceof FunctionJp) {
                            return [MoveTable.DropKind.DROP_AFTER, currentState];
                        } else if (
                            $parent instanceof Vardecl ||
                            ($parent instanceof BinaryOp && $parent.isAssignment)
                        ) {
                            break;
                        }

                        $parent = $parent.parent;
                    }
                }
                break;
            case Access.Kind.WRITE:
                currentState = holder.copy();

                if (!this.#hasDeref(path)) {
                    let parent = holder.parent;
                    let parentPath: Path | undefined = path;
                    if (path instanceof PathMemberAccess) {
                        parentPath = path.inner;
                    }
                    let outerWithDropFunction: MoveTable.FieldStates | undefined;
                    let outerWithDropFunctionPath: Path | undefined;
                    while (parent !== undefined) {
                        if (
                            parent instanceof MoveTable.FieldStates &&
                            parent.hasDropFunction
                        ) {
                            outerWithDropFunction = parent;
                            outerWithDropFunctionPath = parentPath;
                        }
                        parent = parent.parent;
                        if (parentPath instanceof PathMemberAccess) {
                            parentPath = parentPath.inner;
                        } else {
                            parentPath = undefined;
                        }
                    }
                    if (
                        outerWithDropFunction !== undefined &&
                        (outerWithDropFunction.dropState ===
                            MoveTable.State.MAYBE_MOVED ||
                            outerWithDropFunction.dropState ===
                                MoveTable.State.MAYBE_UNINIT)
                    ) {
                        throw new WriteFieldOfPotentiallyDroppedTypeError(
                            outerWithDropFunctionPath!,
                            access,
                            outerWithDropFunction.exampleMoveAccess!,
                        );
                    }
                }

                holder.state = MoveTable.State.VALID;
                return [MoveTable.DropKind.DROP_BEFORE, currentState];
            case Access.Kind.STORAGE_DEAD:
                currentState = holder.copy();
                this.#states.delete($vardecl.astId);
                return [MoveTable.DropKind.DROP_BEFORE, currentState];
        }

        return [MoveTable.DropKind.NO_DROP, holder];
    }

    #pathToVardecl(path: Path): Vardecl {
        if (path instanceof PathVarRef) {
            return path.vardecl;
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
            return this.#states.get(path.vardecl.astId);
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

                try {
                    currentValue.mergeWith(value);
                } catch (e) {
                    if (e instanceof MergeInconsistentStructError.Stub) {
                        e.vardecl = table.#vardecls.get(key);
                    }
                    throw e;
                }
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
            if (ty instanceof StructTy && ty.isComplete) {
                const states = new Map<string, StateHolder>();
                for (const [field, fieldTy] of ty.fields.entries()) {
                    states.set(
                        field,
                        StateHolder.create($vardecl, fieldTy, initialState),
                    );
                }
                return new FieldStates(
                    states,
                    initialState,
                    ty.dropFunction !== undefined,
                );
            } else {
                return new SingleState(initialState);
            }
        }

        get field(): string | undefined {
            if (this.parent === undefined || !(this.parent instanceof FieldStates)) {
                return undefined;
            }

            for (const [key, value] of this.parent.substates) {
                if (value === this) {
                    return key;
                }
            }
        }

        abstract set parent(parent: StateHolder);
        abstract get parent(): StateHolder | undefined;
        abstract propagateValid(): void;
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
        parent: StateHolder | undefined;

        constructor(state: State, parent?: StateHolder) {
            super();
            this.#state = state;
            this.parent = parent;
        }

        propagateValid(): void {
            this.#state = MoveTable.State.VALID;
            if (this.parent !== undefined) {
                this.parent.propagateValid();
            }
        }

        getVarNames(state: MoveTable.State): string[] {
            return state === this.#state ? [""] : [];
        }

        set state(state: MoveTable.State) {
            this.#state = state;
            if (this.parent !== undefined && state === MoveTable.State.VALID) {
                this.parent.propagateValid();
            }
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
            const result = new SingleState(this.#state, this.parent);
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
        substates: Map<string, StateHolder>;
        hasDropFunction: boolean;
        #state: State;
        parent: StateHolder | undefined;

        constructor(
            states: Map<string, StateHolder>,
            initialState: State,
            hasDropFunction: boolean,
            parent?: StateHolder,
        ) {
            super();
            this.substates = states;
            for (const state of states.values()) {
                state.parent = this;
            }
            this.hasDropFunction = hasDropFunction;
            this.#state = initialState;
            this.parent = parent;
        }

        propagateValid(): void {
            this.#state = MoveTable.State.VALID;
            if (this.parent !== undefined) {
                this.parent.propagateValid();
            }
        }

        get(field: string): StateHolder {
            const state = this.substates.get(field);
            if (state === undefined) {
                throw new Error(`Field ${field} not found`);
            }
            return state;
        }

        getVarNames(state: MoveTable.State): string[] {
            let result: string[] = [];
            if (this.hasDropFunction && this.#state === state) {
                result.push("");
            }

            for (const [field, holder] of this.substates) {
                result = result.concat(
                    holder.getVarNames(state).map((inner) => `.${field}${inner}`),
                );
            }
            return result;
        }

        set state(state: MoveTable.State) {
            this.#state = state;
            for (const holder of this.substates.values()) {
                holder.state = state;
            }
            if (this.parent !== undefined && state === MoveTable.State.VALID) {
                this.parent.propagateValid();
            }
        }

        get state(): MoveTable.State {
            let result: MoveTable.State | undefined;
            for (const holder of this.substates.values()) {
                if (result === undefined) {
                    result = holder.state;
                    continue;
                }

                switch (holder.state) {
                    case MoveTable.State.UNINIT:
                        if (
                            result !== MoveTable.State.MOVED &&
                            result !== MoveTable.State.MAYBE_MOVED
                        ) {
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

        get dropState(): MoveTable.State {
            return this.#state;
        }

        isConsistentState(): boolean {
            for (const holder of this.substates.values()) {
                let realState: MoveTable.State;
                if (holder instanceof SingleState) {
                    realState = holder.state;
                } else if (holder instanceof FieldStates) {
                    if (!holder.isConsistentState()) {
                        return false;
                    }

                    realState = holder.#state;
                } else {
                    throw new Error("Unexpected state holder");
                }

                if (this.#state === realState) {
                    continue;
                }

                if (realState === MoveTable.State.VALID) {
                    if (
                        this.#state === MoveTable.State.MAYBE_MOVED ||
                        this.#state === MoveTable.State.MAYBE_UNINIT
                    ) {
                        continue;
                    }
                }

                return false;
            }
            return true;
        }

        set exampleMoveAccess(access: Access) {
            for (const holder of this.substates.values()) {
                holder.exampleMoveAccess = access;
            }
        }

        get exampleMoveAccess(): Access | undefined {
            for (const holder of this.substates.values()) {
                if (holder.exampleMoveAccess !== undefined) {
                    return holder.exampleMoveAccess;
                }
            }
            return undefined;
        }

        mergeWith(other: StateHolder): void {
            if (other instanceof FieldStates) {
                if (this.hasDropFunction) {
                    if (!this.isConsistentState() || !other.isConsistentState()) {
                        throw new MergeInconsistentStructError.Stub(this);
                    }
                }
                for (const [key, value] of other.substates) {
                    this.substates.get(key)!.mergeWith(value);
                }
                this.#state = this.state;
                other.#state = other.state;
            } else {
                throw new Error("Cannot merge FieldStates with SingleState");
            }
        }

        equals(other: StateHolder): boolean {
            if (other instanceof FieldStates) {
                if (this.hasDropFunction && this.#state !== other.#state) {
                    return false;
                }

                if (this.substates.size !== other.substates.size) {
                    return false;
                }

                for (const [key, value] of this.substates) {
                    if (!other.substates.get(key)?.equals(value)) {
                        return false;
                    }
                }

                return true;
            }
            return false;
        }

        copy(): StateHolder {
            const states = new Map<string, StateHolder>();
            for (const [key, value] of this.substates) {
                states.set(key, value.copy());
            }
            return new FieldStates(
                states,
                this.#state,
                this.hasDropFunction,
                this.parent,
            );
        }
    }
}

export default MoveTable;

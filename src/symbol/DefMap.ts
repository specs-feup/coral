import {
    Field,
    FunctionJp,
    PointerType,
    RecordJp,
} from "@specs-feup/clava/api/Joinpoints.js";
import IncompatibleSemanticsPragmasError from "@specs-feup/coral/error/pragma/IncompatibleSemanticsPragmasError";
import MultipleDropPragmasError from "@specs-feup/coral/error/pragma/MultipleDropPragmasError";
import DropPragmaParseError from "@specs-feup/coral/error/pragma/parse/DropPragmaParseError";
import IncompatibleStructDeclsError from "@specs-feup/coral/error/struct/IncompatibleStructDeclsError";
import InvalidDropFunctionError from "@specs-feup/coral/error/struct/InvalidDropFunctionError";
import StructCannotBeCopyError from "@specs-feup/coral/error/struct/StructCannotBeCopyError";
import UnexpectedLifetimeAssignmentError from "@specs-feup/coral/error/struct/UnexpectedLifetimeAssignmentError";
import Def from "@specs-feup/coral/mir/symbol/Def";
import MetaRegion from "@specs-feup/coral/mir/symbol/region/meta/MetaRegion";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/region/meta/MetaRegionBound";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";
import { errorMetaRegionGenerator, MetaRegionMapper } from "@specs-feup/coral/mir/symbol/ty/meta/MetaTyParser";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import LifetimeAssignmentPragma from "@specs-feup/coral/pragma/lifetime/LifetimeAssignmentPragma";
import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";
import Query from "@specs-feup/lara/api/weaver/Query.js";

export default class DefMap {
    #defTable: Map<string, Def>;

    constructor() {
        this.#defTable = new Map();
    }

    get($struct: RecordJp): Def {
        const def = this.#defTable.get($struct.name);
        if (def !== undefined) {
            return def;
        }

        const $structs = Query.searchFrom(
            $struct.getAncestor("file"),
            RecordJp,
            ($s) => $s.name === $struct.name,
        ).get();

        // Give priority to complete structs
        const $canonicalStruct =
            $structs.find(($s) => $s.fields.length > 0) ?? $structs.at(0);

        if ($canonicalStruct === undefined) {
            throw new Error(
                `There should be at least one RecordJp '${$struct.name}', having id: ${$struct.astId}`,
            );
        }

        // TODO doesnt this crash for incomplete structs?

        const newDef = this.#parseStruct($canonicalStruct);
        this.#defTable.set($struct.name, newDef);
        return newDef;
    }

    #parseIncompleteStruct($struct: RecordJp) {
        const isComplete = $struct.fields.length > 0;

        const pragmas = CoralPragma.parse($struct.pragmas);
        const copyFlag = pragmas.find((p) => p.name === "copy");
        const moveFlag = pragmas.find((p) => p.name === "move");
        if (copyFlag !== undefined && moveFlag !== undefined) {
            throw new IncompatibleSemanticsPragmasError(copyFlag, moveFlag);
        }
        const dropFnPragmas = pragmas.filter((p) => p.name === "drop");

        let dropFnPragma: CoralPragma | undefined = undefined;
        if (dropFnPragmas.length === 1) {
            dropFnPragma = dropFnPragmas[0];
            const tokens = dropFnPragma.tokens;
            if (tokens.length === 0) {
                throw new DropPragmaParseError(
                    dropFnPragma,
                    "Expected a token with the function name",
                );
            }
            if (tokens.length > 1) {
                throw new DropPragmaParseError(
                    dropFnPragma,
                    `Unexpected token '${tokens[1]}'`,
                );
            }
        } else if (dropFnPragmas.length > 1) {
            throw new MultipleDropPragmasError(dropFnPragmas[0], dropFnPragmas[1]);
        }

        const lifetimes = LifetimeBoundPragma.parse(pragmas);
        const lifetimesSet = new Set(lifetimes.map((p) => p.name));

        return {
            isComplete,
            copyFlag,
            moveFlag,
            dropFnPragma,
            lifetimes,
            lifetimesSet,
        };
    }

    #parseStruct($struct: RecordJp): Def {
        const { isComplete, copyFlag, moveFlag, dropFnPragma, lifetimes, lifetimesSet } =
            this.#parseIncompleteStruct($struct);

        const hasCopyFlag = copyFlag !== undefined;
        const hasMoveFlag = moveFlag !== undefined;
        const dropFnName = dropFnPragma?.tokens[0];

        const $structs = Query.searchFrom(
            $struct.getAncestor("file"),
            RecordJp,
            ($s) => $s.name === $struct.name,
        );
        for (const $other of $structs) {
            if (($other as RecordJp).astId === $struct.astId) {
                continue;
            }

            const otherInfo = this.#parseIncompleteStruct($other as RecordJp);

            if (hasCopyFlag !== (otherInfo.copyFlag !== undefined)) {
                throw new IncompatibleStructDeclsError(
                    $struct,
                    copyFlag,
                    "struct marked as 'copy' here",
                    $other as RecordJp,
                    otherInfo.copyFlag,
                    "struct marked as 'copy' here",
                    "no 'copy' mark is present",
                );
            }
            if (hasMoveFlag !== (otherInfo.moveFlag !== undefined)) {
                throw new IncompatibleStructDeclsError(
                    $struct,
                    moveFlag,
                    "struct marked as 'move' here",
                    $other as RecordJp,
                    otherInfo.moveFlag,
                    "struct marked as 'move' here",
                    "no 'move' mark is present",
                );
            }
            if (dropFnName !== otherInfo.dropFnPragma?.tokens[0]) {
                throw new IncompatibleStructDeclsError(
                    $struct,
                    dropFnPragma,
                    `drop function '${dropFnName}' assigned here`,
                    $other as RecordJp,
                    otherInfo.dropFnPragma,
                    `drop function '${otherInfo.dropFnPragma?.tokens[0]}' assigned here`,
                    "no drop function assigned",
                );
            }

            this.#assertLfsInOther(
                $struct,
                lifetimes,
                $other as RecordJp,
                otherInfo.lifetimes,
            );
            this.#assertLfsInOther(
                $other as RecordJp,
                otherInfo.lifetimes,
                $struct,
                lifetimes,
            );
        }

        let $dropFn: FunctionJp | undefined = undefined;
        if (dropFnName !== undefined) {
            const $dropFn = Query.searchFrom(
                $struct.getAncestor("file"),
                FunctionJp,
                ($fn) => $fn.name === dropFnName,
            ).first();
            if ($dropFn === undefined) {
                throw new DropPragmaParseError(
                    dropFnPragma!,
                    `'${dropFnName}' is not a function`,
                );
            }
            if ($dropFn.params.length !== 1) {
                throw new InvalidDropFunctionError(
                    dropFnPragma!,
                    $dropFn,
                    `one parameter expected, got ${$dropFn.params.length}`,
                );
            }
            if ($dropFn.returnType.code !== "void") {
                throw new InvalidDropFunctionError(
                    dropFnPragma!,
                    $dropFn,
                    `return type should be 'void', got '${$dropFn.returnType.code}'`,
                );
            }
            const $paramTy = $dropFn.params[0].type.desugarAll;
            const expected = `struct ${$struct.type.code} *`;
            if (!($paramTy instanceof PointerType && $paramTy.code === expected)) {
                throw new InvalidDropFunctionError(
                    dropFnPragma!,
                    $dropFn,
                    `parameter type should be '${expected}', got '${$paramTy.code}'`,
                );
            }
        }

        const metaRegions = Array.from(lifetimesSet).map(n => new MetaRegion(n));

        const bounds = lifetimes
            .filter((p) => p.bound !== undefined)
            .map(MetaRegionBound.fromPragma);

        // TODO check lifetimesSet
        const fields = new Map<string, MetaTy>();
        for (const $field of $struct.fields) {
            const metaRegionVarAssignments = LifetimeAssignmentPragma.parse(
                CoralPragma.parse($field.pragmas),
            );

            for (const a of metaRegionVarAssignments) {
                if (a.lhs.varName !== $field.name) {
                    throw new UnexpectedLifetimeAssignmentError(a);
                }
            }

            const metaRegionMapper = new MetaRegionMapper(
                metaRegionVarAssignments,
                errorMetaRegionGenerator($field),
            );
            const fieldTy = MetaTy.parse($field.type, metaRegionMapper, this);
            fields.set($field.name, fieldTy);
        }

        let semantics = Ty.Semantics.MOVE;
        let mayBeCopy = $dropFn === undefined;

        if (isComplete) {
            let $moveFieldExample: Field | undefined = undefined;
            for (const [fieldName, metaTy] of fields.entries()) {
                if (metaTy.semantics !== Ty.Semantics.COPY) {
                    mayBeCopy = false;
                    $moveFieldExample = $struct.fields.find((f) => f.name === fieldName)!;
                    break;
                }
            }

            if (hasCopyFlag && !mayBeCopy) {
                throw new StructCannotBeCopyError(
                    copyFlag!,
                    dropFnPragma,
                    $moveFieldExample,
                );
            }

            if (mayBeCopy && !hasMoveFlag) {
                semantics = Ty.Semantics.COPY;
            }
        } else {
            if (hasCopyFlag) {
                if (mayBeCopy) {
                    semantics = Ty.Semantics.COPY;
                } else {
                    throw new StructCannotBeCopyError(copyFlag!, dropFnPragma);
                }
            }
        }

        return new Def(
            $struct,
            isComplete,
            semantics,
            fields,
            metaRegions,
            bounds,
            $dropFn,
        );
    }

    // Checks if all `lifetimes` are also in `otherLifetimes`
    #assertLfsInOther(
        $struct: RecordJp,
        lifetimes: LifetimeBoundPragma[],
        $other: RecordJp,
        otherLifetimes: LifetimeBoundPragma[],
    ) {
        for (const lifetimePragma of lifetimes) {
            otherLifetimes = otherLifetimes.filter((p) => p.name === lifetimePragma.name);
            const isBoundCompatible = otherLifetimes.some(
                (p) =>
                    lifetimePragma.bound === undefined ||
                    p.bound === lifetimePragma.bound,
            );

            if (!isBoundCompatible) {
                const thisStructMessage =
                    lifetimePragma.bound === undefined
                        ? `lifetime '${lifetimePragma.name}' assigned here`
                        : `lifetime '${lifetimePragma.name}' assigned here, bound to '${lifetimePragma.bound}'`;

                const otherStructMessage = `lifetime '${lifetimePragma.name}' assigned here but without '${lifetimePragma.bound} bound`;

                throw new IncompatibleStructDeclsError(
                    $struct,
                    lifetimePragma.pragma,
                    thisStructMessage,
                    $other as RecordJp,
                    otherLifetimes[0].pragma,
                    otherStructMessage,
                    `lifetime '${lifetimePragma.name}' not assigned`,
                );
            }
        }
    }
}

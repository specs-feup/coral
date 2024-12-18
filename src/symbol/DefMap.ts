import {
    BuiltinType,
    ElaboratedType,
    EnumDecl,
    Field,
    FunctionJp,
    ParenType,
    PointerType,
    QualType,
    RecordJp,
    TagType,
    Type,
    TypedefType,
} from "@specs-feup/clava/api/Joinpoints.js";
import IncompatibleSemanticsPragmasError from "@specs-feup/coral/error/pragma/IncompatibleSemanticsPragmasError";
import MultipleDropPragmasError from "@specs-feup/coral/error/pragma/MultipleDropPragmasError";
import DropPragmaParseError from "@specs-feup/coral/error/pragma/parse/DropPragmaParseError";
import IncompatibleStructDeclsError from "@specs-feup/coral/error/struct/IncompatibleStructDeclsError";
import InvalidDropFunctionError from "@specs-feup/coral/error/struct/InvalidDropFunctionError";
import LifetimeExpectedError from "@specs-feup/coral/error/struct/LifetimeExpectedError";
import LifetimeReassignmentError from "@specs-feup/coral/error/struct/LifetimeReassignmentError";
import StructCannotBeCopyError from "@specs-feup/coral/error/struct/StructCannotBeCopyError";
import UnexpectedLifetimeAssignmentError from "@specs-feup/coral/error/struct/UnexpectedLifetimeAssignmentError";
import Def from "@specs-feup/coral/mir/symbol/Def";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/MetaRegionBound";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import BuiltinTy from "@specs-feup/coral/mir/symbol/ty/BuiltinTy";
import MetaRefTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaRefTy";
import MetaStructTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaStructTy";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import LifetimeAssignmentPragma from "@specs-feup/coral/pragma/lifetime/LifetimeAssignmentPragma";
import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";
import LfPath from "@specs-feup/coral/pragma/lifetime/path/LfPath";
import LfPathDeref from "@specs-feup/coral/pragma/lifetime/path/LfPathDeref";
import LfPathMemberAccess from "@specs-feup/coral/pragma/lifetime/path/LfPathMemberAccess";
import LfPathVarRef from "@specs-feup/coral/pragma/lifetime/path/LfPathVarRef";
import MetaRegionVariableBound from "@specs-feup/coral/regionck/MetaRegionVariableBound";
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
            console.log(($other as RecordJp).location, ($other as RecordJp).name);
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

        const metaRegions = Array.from(lifetimesSet);

        const bounds = lifetimes
            .filter((p) => p.bound !== undefined)
            .map((p) => new MetaRegionBound(p));

        const fields = new Map<string, MetaTy>();
        for (const $field of $struct.fields) {
            const metaRegionVarAssignments = LifetimeAssignmentPragma.parse(
                CoralPragma.parse($field.pragmas),
            ).map((p): [LfPath, string, LifetimeAssignmentPragma] => [p.lhs, p.rhs, p]);
            const fieldTy = this.#parseMetaType(
                $field,
                $field.name,
                $field.type,
                lifetimesSet,
                metaRegionVarAssignments,
            );

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

    #parseMetaType(
        $field: Field,
        name: string,
        $type: Type,
        metaRegionVars: Set<string>,
        metaRegionVarAssignments: [LfPath, string, LifetimeAssignmentPragma][],
        isConst = false,
        isRestrict = false,
    ): MetaTy {
        // TODO check metaRegionVars
        if ($type instanceof QualType) {
            if ($type.qualifiers.includes("const")) {
                isConst = true;
            }
            if ($type.qualifiers.includes("restrict")) {
                isRestrict = true;
            }
            $type = $type.unqualifiedType;
        }

        if ($type instanceof BuiltinType) {
            if (metaRegionVarAssignments.length > 0) {
                throw new UnexpectedLifetimeAssignmentError(
                    metaRegionVarAssignments[0][2],
                );
            }
            return new BuiltinTy($type.builtinKind, $type, isConst);
        } else if ($type instanceof PointerType) {
            const innerLfs = metaRegionVarAssignments
                .filter(([lfPath]) => !(lfPath instanceof LfPathVarRef))
                .map(
                    ([lfPath, regionVar, pragma]): [
                        LfPath,
                        string,
                        LifetimeAssignmentPragma,
                    ] => {
                        if (lfPath instanceof LfPathDeref) {
                            return [(lfPath as LfPathDeref).inner, regionVar, pragma];
                        } else if (lfPath instanceof LfPathMemberAccess) {
                            const lfPathInner = lfPath.inner;
                            if (!(lfPathInner instanceof LfPathDeref)) {
                                throw new UnexpectedLifetimeAssignmentError(pragma);
                            }
                            return [
                                new LfPathMemberAccess(lfPathInner.inner, lfPath.member),
                                regionVar,
                                pragma,
                            ];
                        }
                        throw new Error("Unhandled LfPath");
                    },
                );
            const inner = this.#parseMetaType(
                $field,
                name,
                $type.pointee,
                metaRegionVars,
                innerLfs,
            );
            if (inner.isConst && isRestrict) {
                throw new Error("Cannot have a restrict pointer to a const type");
            }
            const outer = metaRegionVarAssignments.filter(
                ([lfPath]) => lfPath instanceof LfPathVarRef,
            );
            if (outer.length > 1) {
                throw new LifetimeReassignmentError(outer[0][2], outer[0][2]);
            }
            if (outer.length === 0) {
                throw new LifetimeExpectedError($field);
            }
            if ((outer[0][0] as LfPathVarRef).identifier !== name) {
                throw new UnexpectedLifetimeAssignmentError(outer[0][2]);
            }
            return new MetaRefTy(new MetaRegion(outer[0][1]), inner, $type, isConst);
        } else if ($type instanceof TypedefType) {
            return this.#parseMetaType(
                $field,
                name,
                $type.underlyingType,
                metaRegionVars,
                metaRegionVarAssignments,
                isConst,
                isRestrict,
            );
        } else if ($type instanceof ElaboratedType) {
            return this.#parseMetaType(
                $field,
                name,
                $type.namedType,
                metaRegionVars,
                metaRegionVarAssignments,
                isConst,
                isRestrict,
            );
        } else if ($type instanceof ParenType) {
            return this.#parseMetaType(
                $field,
                name,
                $type.innerType,
                metaRegionVars,
                metaRegionVarAssignments,
                isConst,
                isRestrict,
            );
        } else if ($type instanceof TagType) {
            const $decl = $type.decl;
            if ($decl instanceof RecordJp) {
                const invalidMetaRegionVarAssignment = metaRegionVarAssignments.find(
                    ([lfPath]) => !(lfPath instanceof LfPathMemberAccess),
                );
                if (invalidMetaRegionVarAssignment !== undefined) {
                    throw new UnexpectedLifetimeAssignmentError(
                        invalidMetaRegionVarAssignment[2],
                    );
                }

                const regionVarMap = new Map<string, MetaRegion>();

                for (const [lfPath, regionVar, pragma] of metaRegionVarAssignments) {
                    const memberAccess = lfPath as LfPathMemberAccess;
                    const memberAccessInner = memberAccess.inner;
                    if (memberAccessInner instanceof LfPathVarRef) {
                        if (memberAccessInner.identifier !== name) {
                            throw new UnexpectedLifetimeAssignmentError(pragma);
                        }
                    } else {
                        throw new UnexpectedLifetimeAssignmentError(pragma);
                    }

                    regionVarMap.set(memberAccess.member, new MetaRegion(regionVar));
                }

                return new MetaStructTy($decl, this, regionVarMap, isConst);
            } else if ($decl instanceof EnumDecl) {
                if (metaRegionVarAssignments.length > 0) {
                    throw new UnexpectedLifetimeAssignmentError(
                        metaRegionVarAssignments[0][2],
                    );
                }
                return new BuiltinTy(`enum ${$decl.name}`, $decl, isConst);
            } else {
                // TypedefNameDecl;
                //     TypedefDecl;
                throw new Error("Unhandled parseType TagType: " + $decl.joinPointType);
            }
        } else {
            // UndefinedType;
            // AdjustedType;
            // ArrayType;
            //     VariableArrayType;
            // FunctionType;
            throw new Error("Unhandled parseType: " + $type.joinPointType);
        }
    }
}

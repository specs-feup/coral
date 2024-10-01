import { BuiltinType, ElaboratedType, EnumDecl, Field, FileJp, FunctionJp, ParenType, PointerType, QualType, RecordJp, TagType, Type, TypedefType } from "@specs-feup/clava/api/Joinpoints.js";
import IncompatibleSemanticsPragmasError from "coral/error/pragma/IncompatibleSemanticsPragmasError";
import MultipleDropPragmasError from "coral/error/pragma/MultipleDropPragmasError";
import DropPragmaParseError from "coral/error/pragma/parse/DropPragmaParseError";
import IncompatibleStructDeclsError from "coral/error/struct/IncompatibleStructDeclsError";
import InvalidDropFunctionError from "coral/error/struct/InvalidDropFunctionError";
import LifetimeExpectedError from "coral/error/struct/LifetimeExpectedError";
import LifetimeReassignmentError from "coral/error/struct/LifetimeReassignmentError";
import StructCannotBeCopyError from "coral/error/struct/StructCannotBeCopyError";
import UnexpectedLifetimeAssignmentError from "coral/error/struct/UnexpectedLifetimeAssignmentError";
import BorrowKind from "coral/mir/ty/BorrowKind";
import BuiltinTy from "coral/mir/ty/BuiltinTy";
import Ty from "coral/mir/ty/Ty";
import MetaRefTy from "coral/mir/ty/meta/MetaRefTy";
import MetaStructTy from "coral/mir/ty/meta/MetaStructTy";
import MetaTy from "coral/mir/ty/meta/MetaTy";
import StructDef from "coral/mir/ty/meta/StructDef";
import CoralPragma from "coral/pragma/CoralPragma";
import LifetimeAssignmentPragma from "coral/pragma/lifetime/LifetimeAssignmentPragma";
import LifetimeBoundPragma from "coral/pragma/lifetime/LifetimeBoundPragma";
import LfPath from "coral/pragma/lifetime/path/LfPath";
import LfPathDeref from "coral/pragma/lifetime/path/LfPathDeref";
import LfPathMemberAccess from "coral/pragma/lifetime/path/LfPathMemberAccess";
import LfPathVarRef from "coral/pragma/lifetime/path/LfPathVarRef";
import MetaRegionVariable from "coral/regionck/MetaRegionVariable";
import MetaRegionVariableBound from "coral/regionck/MetaRegionVariableBound";
import Query from "@specs-feup/lara/api/weaver/Query.js";

export default class StructDefsMap {
    #defs: Map<string, StructDef>;
    #$file: FileJp;

    constructor($file: FileJp) {
        this.#defs = new Map();
        this.#$file = $file;
    }

    get($struct: RecordJp): StructDef {
        const name = $struct.name;
        const def = this.#defs.get(name);
        if (def !== undefined) {
            return def;
        }
        
        const $structs = Query
            .searchFrom(this.#$file, "record", { name })
            .get() as RecordJp[];
        
        // Give priority to complete structs
        const $canonicalStruct = $structs
            .find(($s) => $s.fields.length > 0)
            ?? $structs.at(0);

        if ($canonicalStruct === undefined) {
            throw new Error(`There should be at least one RecordJp '${$struct.name}', having id: ${$struct.astId}`);
        }
        
        const structDef = this.#parseStruct($canonicalStruct);
        this.#defs.set(name, structDef);
        return structDef;
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
                throw new DropPragmaParseError(dropFnPragma, "Expected a token with the function name");
            }
            if (tokens.length > 1) {
                throw new DropPragmaParseError(dropFnPragma, `Unexpected token '${tokens[1]}'`);
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

    #parseStruct($struct: RecordJp): StructDef {
        const {
            isComplete,
            copyFlag,
            moveFlag,
            dropFnPragma,
            lifetimes,
            lifetimesSet,
        } = this.#parseIncompleteStruct($struct);

        const hasCopyFlag = copyFlag !== undefined;
        const hasMoveFlag = moveFlag !== undefined;
        const dropFnName = dropFnPragma?.tokens[0];

        for (const $other of Query.searchFrom(this.#$file, "record", { name: $struct.name })) {
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

            this.#assertLfsInOther($struct, lifetimes, $other as RecordJp, otherInfo.lifetimes);
            this.#assertLfsInOther($other as RecordJp, otherInfo.lifetimes, $struct, lifetimes);
        }

        let $dropFn: FunctionJp | undefined = undefined;
        if (dropFnName !== undefined) {
            $dropFn = Query.searchFrom(this.#$file, "function", { name: dropFnName }).first() as
                | FunctionJp
                | undefined;
            if ($dropFn === undefined) {
                throw new DropPragmaParseError(dropFnPragma!, `'${dropFnName}' is not a function`);
            }
            if ($dropFn.params.length !== 1) {
                throw new InvalidDropFunctionError(dropFnPragma!, $dropFn, `one parameter expected, got ${$dropFn.params.length}`);
            }
            if ($dropFn.returnType.code !== "void") {
                throw new InvalidDropFunctionError(dropFnPragma!, $dropFn, `return type should be 'void', got '${$dropFn.returnType.code}'`);
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

        const metaRegionVars = Array.from(lifetimesSet).map(
            (name) => new MetaRegionVariable(name),
        );

        const bounds = lifetimes
            .filter((p) => p.bound !== undefined)
            .map((p) => new MetaRegionVariableBound(p.name, p.bound!));

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
                    $moveFieldExample = $struct.fields.find(f => f.name === fieldName)!;
                    break;
                }
            }

            if (hasCopyFlag && !mayBeCopy) {
                throw new StructCannotBeCopyError(copyFlag!, dropFnPragma, $moveFieldExample);
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

        return new StructDef(
            $struct,
            isComplete,
            semantics,
            fields,
            metaRegionVars,
            bounds,
            $dropFn,
        );
    }

    // Checks if all `lifetimes` are also in `otherLifetimes`
    #assertLfsInOther(
        $struct: RecordJp,
        lifetimes: LifetimeBoundPragma[],
        $other: RecordJp,
        otherLifetimes: LifetimeBoundPragma[]
    ) {
        for (const lifetimePragma of lifetimes) {
            otherLifetimes = otherLifetimes.filter(
                (p) => p.name === lifetimePragma.name,
            );
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
                throw new UnexpectedLifetimeAssignmentError(metaRegionVarAssignments[0][2]);
            }
            return new BuiltinTy($type.builtinKind, $type, isConst);
        } else if ($type instanceof PointerType) {
            const innerLfs = metaRegionVarAssignments
                .filter(([lfPath]) => !(lfPath instanceof LfPathVarRef))
                .map(([lfPath, regionVar, pragma]): [LfPath, string, LifetimeAssignmentPragma] => {
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
                            pragma
                        ];
                    }
                    throw new Error("Unhandled LfPath");
                });
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
            return new MetaRefTy(
                inner.isConst ? BorrowKind.SHARED : BorrowKind.MUTABLE,
                inner,
                $type,
                new MetaRegionVariable(outer[0][1]),
                isConst,
            );
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

                const regionVarMap = new Map<string, MetaRegionVariable>();

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

                    regionVarMap.set(
                        memberAccess.member,
                        new MetaRegionVariable(regionVar),
                    );
                }

                return new MetaStructTy($decl, regionVarMap, this, isConst);
            } else if ($decl instanceof EnumDecl) {
                if (metaRegionVarAssignments.length > 0) {
                    throw new UnexpectedLifetimeAssignmentError(metaRegionVarAssignments[0][2]);
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

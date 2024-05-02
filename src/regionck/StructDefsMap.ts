import { BuiltinType, ElaboratedType, EnumDecl, FileJp, FunctionJp, ParenType, PointerType, QualType, RecordJp, TagType, Type, TypedefType } from "clava-js/api/Joinpoints.js";
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
import Query from "lara-js/api/weaver/Query.js";

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
            throw new Error("There should be at least one RecordJp, having id: " + $struct.astId);
        }
        
        const structDef = this.#parseStruct($canonicalStruct);
        this.#defs.set(name, structDef);
        return structDef;
    }

    #parseIncompleteStruct($struct: RecordJp) {
        const isComplete = $struct.fields.length > 0;

        const pragmas = CoralPragma.parse($struct.pragmas);
        const hasCopyFlag = pragmas.some((p) => p.name === "copy");
        const hasMoveFlag = pragmas.some((p) => p.name === "move");
        if (hasCopyFlag && hasMoveFlag) {
            // TODO error
        }
        const dropFnPragmas = pragmas.filter((p) => p.name === "drop");

        let dropFnName: string | undefined = undefined;
        if (dropFnPragmas.length === 1) {
            if (dropFnPragmas[0].tokens.length !== 1) {
                // TODO error
            }
            dropFnName = dropFnPragmas[0].tokens[0];
        } else if (dropFnPragmas.length > 1) {
            // TODO error
        }

        const lifetimes = LifetimeBoundPragma.parse(pragmas);
        const lifetimesSet = new Set(lifetimes.map((p) => p.name));

        return {
            isComplete,
            hasCopyFlag,
            hasMoveFlag,
            dropFnName,
            lifetimes,
            lifetimesSet,
        };
    }

    #parseStruct($struct: RecordJp): StructDef {
        const {
            isComplete,
            hasCopyFlag,
            hasMoveFlag,
            dropFnName,
            lifetimes,
            lifetimesSet,
        } = this.#parseIncompleteStruct($struct);

        for (const $other of Query.searchFrom(this.#$file, "record", { name: $struct.name })) {
            const otherInfo = this.#parseIncompleteStruct($other as RecordJp);
            if (hasCopyFlag !== otherInfo.hasCopyFlag) {
                // TODO error
            }
            if (hasMoveFlag !== otherInfo.hasMoveFlag) {
                // TODO error
            }
            if (dropFnName !== otherInfo.dropFnName) {
                // TODO error
            }
            if (lifetimesSet.size !== otherInfo.lifetimesSet.size) {
                // TODO error
            }
            for (const lifetime of lifetimesSet.values()) {
                if (!otherInfo.lifetimesSet.has(lifetime)) {
                    // TODO error
                }
            }
        }

        let dropFn: FunctionJp | undefined = undefined;
        if (dropFnName !== undefined) {
            dropFn = Query.searchFrom(this.#$file, "function", { name: dropFnName }).first() as
                | FunctionJp
                | undefined;
            if (dropFn === undefined) {
                // TODO error
                throw new Error("TODO ERROR");
            }
            if (dropFn.params.length !== 1) {
                // TODO error
            }

            // TODO check if parameter is a reference to the struct
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
            ).map((p): [LfPath, string] => [p.lhs, p.rhs]);
            const fieldTy = this.#parseMetaType(
                $field.name,
                $field.type,
                lifetimesSet,
                metaRegionVarAssignments,
            );

            fields.set($field.name, fieldTy);
        }

        let semantics = Ty.Semantics.MOVE;
        let mayBeCopy = dropFn === undefined;

        if (isComplete) {
            for (const metaTy of fields.values()) {
                if (metaTy.semantics !== Ty.Semantics.COPY) {
                    mayBeCopy = false;
                    break;
                }
            }

            if (hasCopyFlag && !mayBeCopy) {
                // TODO error
            }

            if (mayBeCopy && !hasMoveFlag) {
                semantics = Ty.Semantics.COPY;
            }
        } else {
            if (hasCopyFlag) {
                if (mayBeCopy) {
                    semantics = Ty.Semantics.COPY;
                } else {
                    // TODO error
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
            dropFn,
        );
    }

    #parseMetaType(
        name: string,
        $type: Type,
        metaRegionVars: Set<string>,
        metaRegionVarAssignments: [LfPath, string][],
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
                // TODO error
            }
            return new BuiltinTy($type.builtinKind, $type, isConst);
        } else if ($type instanceof PointerType) {
            const innerLfs = metaRegionVarAssignments
                .filter(([lfPath, _]) => !(lfPath instanceof LfPathVarRef))
                .map(([lfPath, regionVar]): [LfPath, string] => {
                    if (lfPath instanceof LfPathDeref) {
                        return [(lfPath as LfPathDeref).inner, regionVar];
                    } else if (lfPath instanceof LfPathMemberAccess) {
                        const lfPathInner = lfPath.inner;
                        if (!(lfPathInner instanceof LfPathDeref)) {
                            // TODO error
                            throw new Error("TODO ERROR");
                        }
                        return [
                            new LfPathMemberAccess(lfPathInner.inner, lfPath.member),
                            regionVar,
                        ];
                    }
                    throw new Error("Unhandled LfPath");
                });
            const inner = this.#parseMetaType(
                name,
                $type.pointee,
                metaRegionVars,
                innerLfs,
            );
            if (inner.isConst && isRestrict) {
                throw new Error("Cannot have a restrict pointer to a const type");
            }
            const outer = metaRegionVarAssignments.filter(
                ([lfPath, _]) => lfPath instanceof LfPathVarRef,
            );
            if (outer.length > 1) {
                // TODO error
            }
            if (outer.length === 0) {
                // TODO error
            }
            if ((outer[0][0] as LfPathVarRef).identifier !== name) {
                // TODO error
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
                name,
                $type.underlyingType,
                metaRegionVars,
                metaRegionVarAssignments,
                isConst,
                isRestrict,
            );
        } else if ($type instanceof ElaboratedType) {
            return this.#parseMetaType(
                name,
                $type.namedType,
                metaRegionVars,
                metaRegionVarAssignments,
                isConst,
                isRestrict,
            );
        } else if ($type instanceof ParenType) {
            return this.#parseMetaType(
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
                if (
                    metaRegionVarAssignments.some(
                        ([lfPath, _]) => !(lfPath instanceof LfPathMemberAccess),
                    )
                ) {
                    // TODO error
                }

                const regionVarMap = new Map<string, MetaRegionVariable>();

                for (const [lfPath, regionVar] of metaRegionVarAssignments) {
                    const memberAccess = lfPath as LfPathMemberAccess;
                    const memberAccessInner = memberAccess.inner;
                    if (memberAccessInner instanceof LfPathVarRef) {
                        if (memberAccessInner.identifier !== name) {
                            // TODO error
                        }
                    } else {
                        // TODO error
                    }

                    regionVarMap.set(
                        memberAccess.member,
                        new MetaRegionVariable(regionVar),
                    );
                }

                return new MetaStructTy($decl, regionVarMap, this, isConst);
            } else if ($decl instanceof EnumDecl) {
                if (metaRegionVarAssignments.length > 0) {
                    // TODO error
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

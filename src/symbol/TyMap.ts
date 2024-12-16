import { BuiltinType, ElaboratedType, EnumDecl, NamedDecl, ParenType, PointerType, QualType, RecordJp, TagType, Type, TypedefType, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import UnexpectedLifetimeAssignmentError from "@specs-feup/coral/error/struct/UnexpectedLifetimeAssignmentError";
import Loan from "@specs-feup/coral/mir/Loan";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import BuiltinTy from "@specs-feup/coral/mir/symbol/ty/BuiltinTy";
import RefTy from "@specs-feup/coral/mir/symbol/ty/RefTy";
import StructTy from "@specs-feup/coral/mir/symbol/ty/StructTy";
import LifetimeAssignmentPragma from "@specs-feup/coral/pragma/lifetime/LifetimeAssignmentPragma";
import LfPath from "@specs-feup/coral/pragma/lifetime/path/LfPath";
import LfPathDeref from "@specs-feup/coral/pragma/lifetime/path/LfPathDeref";
import LfPathMemberAccess from "@specs-feup/coral/pragma/lifetime/path/LfPathMemberAccess";
import LfPathVarRef from "@specs-feup/coral/pragma/lifetime/path/LfPathVarRef";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";
import FileSymbolTable from "@specs-feup/coral/symbol/FileSymbolTable";

class ParseTypeContext {
    lifetimeAssignments: [LfPath, RegionVariable, LifetimeAssignmentPragma][];
    // for generating region variables
    regionType: RegionVariable.Kind;
    // for generating region variables
    takenLifetimeNames: Set<string>;
    // for generating region variables
    newPragmaLhs: string;
    isConst: boolean;
    isRestrict: boolean;

    constructor() {
        this.lifetimeAssignments = [];
        this.regionType = RegionVariable.Kind.EXISTENTIAL;
        this.takenLifetimeNames = new Set();
        this.newPragmaLhs = "";
        this.isConst = false;
        this.isRestrict = false;
    }

    get hasLifetimeAssignments(): boolean {
        return this.lifetimeAssignments.length > 0;
    }
}

export default class TyMap {
    /**
     * Maps {@link NamedDecl} ids to their {@link Ty}.
     */
    #symbolTable: Map<string, Ty>;
    #fileSymbolTable: FileSymbolTable;

    constructor(fileSymbolTable: FileSymbolTable) {
        this.#symbolTable = new Map();
        this.#fileSymbolTable = fileSymbolTable;
    }

    get($decl: Vardecl): Ty {
        const ty = this.#symbolTable.get($decl.astId);
        if (ty !== undefined) {
            return ty;
        }

        // TODO for global variables, multiple declarations may exist
        //      we should look into every declaration to check if everything
        //      is ok

        const newTy = this.#parseType($decl.type, new ParseTypeContext());
        this.#symbolTable.set($decl.astId, newTy);
        return newTy;
    }

    #parseType($type: Type, ctx: ParseTypeContext): Ty {
        if ($type instanceof QualType) {
            if ($type.qualifiers.includes("const")) {
                ctx.isConst = true;
            }
            if ($type.qualifiers.includes("restrict")) {
                ctx.isRestrict = true;
            }
            $type = $type.unqualifiedType;
        }

        if ($type instanceof BuiltinType) {
            return this.#parseBuiltin($type, $type.builtinKind, ctx);
        } else if ($type instanceof PointerType) {
            return this.#parsePointer($type, ctx);
        } else if ($type instanceof TypedefType) {
            return this.#parseType($type.underlyingType, ctx);
        } else if ($type instanceof ElaboratedType) {
            return this.#parseType($type.namedType, ctx);
        } else if ($type instanceof ParenType) {
            return this.#parseType($type.innerType, ctx);
        } else if ($type instanceof TagType) {
            const $decl = $type.decl;
            if ($decl instanceof RecordJp) {
                return this.#parseStruct($decl, ctx);
            } else if ($decl instanceof EnumDecl) {
                return this.#parseBuiltin($decl, `enum ${$decl.name}`, ctx);
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

            
            // TODO error message
            throw new Error("Unhandled parseType: " + $type.joinPointType);
        }
    }

    #parseBuiltin($type: BuiltinType | EnumDecl, name: string, ctx: ParseTypeContext): BuiltinTy {
        if (ctx.hasLifetimeAssignments) {
            // TODO error
            throw new UnexpectedLifetimeAssignmentError(ctx.lifetimeAssignments[0][2]);
        }
        return new BuiltinTy(name, $type, ctx.isConst);
    }

    #parsePointer($type: PointerType, ctx: ParseTypeContext): RefTy {
        // TODO extract
        const innerLfs = ctx.lifetimeAssignments
            .filter(([lfPath]) => !(lfPath instanceof LfPathVarRef))
            .map(
                ([lfPath, regionVar, pragma]): [
                    LfPath,
                    RegionVariable,
                    LifetimeAssignmentPragma,
                ] => {
                    if (lfPath instanceof LfPathDeref) {
                        return [(lfPath as LfPathDeref).inner, regionVar, pragma];
                    } else if (lfPath instanceof LfPathMemberAccess) {
                        const lfPathInner = lfPath.inner;
                        if (!(lfPathInner instanceof LfPathDeref)) {
                            // TODO error
                            // throw new UnexpectedLifetimeAssignmentError(pragma);
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
        
        const inner = this.#parseType($type.pointee,

            innerLfs,
            regionType,
            takenLifetimeNames,
            `(*${newPragmaLhs})`,
        );
        if (inner.isConst && ctx.isRestrict) {
            throw new Error("Cannot have a restrict pointer to a const type");
        }
        const outer = ctx.lifetimeAssignments.filter(
            ([lfPath]) => lfPath instanceof LfPathVarRef,
        );
        if (outer.length > 1) {
            // TODO error
            // throw new LifetimeReassignmentError(outer[0][2], outer[0][2]);
        }
        let regionVar: RegionVariable;
        if (outer.length === 0) {
            regionVar = this.#generateRegionVar(
                regionType,
                takenLifetimeNames,
                newPragmaLhs,
            );
        } else {
            regionVar = outer[0][1];
        }
        return new RefTy(
            regionVar,
            inner,
            $type,
            ctx.isConst,
        );
    }

    #parseStruct($decl: RecordJp, ctx: ParseTypeContext): StructTy {
        const invalidMetaRegionVarAssignment = ctx.lifetimeAssignments.find(
            ([lfPath]) => !(lfPath instanceof LfPathMemberAccess),
        );
        if (invalidMetaRegionVarAssignment !== undefined) {
            // TODO error
            // throw new UnexpectedLifetimeAssignmentError(
            //     invalidMetaRegionVarAssignment[2],
            // );
        }

        const structDef = this.#fileSymbolTable.get($decl);

        const regionVars = new Map<string, RegionVariable>();

        for (const [lfPath, regionVar, pragma] of ctx.lifetimeAssignments) {
            const memberAccess = lfPath as LfPathMemberAccess;
            const memberAccessInner = memberAccess.inner;
            if (!(memberAccessInner instanceof LfPathVarRef)) {
                // TODO error
                // throw new UnexpectedLifetimeAssignmentError(pragma);
            }

            regionVars.set(memberAccess.member, regionVar);
        }

        for (const metaRegionVar of structDef.metaRegionVars) {
            if (!regionVars.has(metaRegionVar.name)) {
                const regionVar = this.#generateRegionVar(
                    regionType,
                    takenLifetimeNames,
                    `${newPragmaLhs}.${metaRegionVar.name}`,
                );
                regionVars.set(metaRegionVar.name, regionVar);
            }
        }

        return new StructTy(structDef, regionVars, ctx.isConst);
    }
}

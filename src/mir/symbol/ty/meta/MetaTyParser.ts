import {
    BuiltinType,
    ElaboratedType,
    EnumDecl,
    Field,
    ParenType,
    PointerType,
    QualType,
    RecordJp,
    TagType,
    Type,
    TypedefType,
} from "@specs-feup/clava/api/Joinpoints.js";
import LifetimeExpectedError from "@specs-feup/coral/error/struct/LifetimeExpectedError";
import LifetimeReassignmentError from "@specs-feup/coral/error/struct/LifetimeReassignmentError";
import UnexpectedLifetimeAssignmentError from "@specs-feup/coral/error/struct/UnexpectedLifetimeAssignmentError";
import MetaRegion from "@specs-feup/coral/mir/symbol/region/meta/MetaRegion";
import BuiltinTy from "@specs-feup/coral/mir/symbol/ty/BuiltinTy";
import MetaRefTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaRefTy";
import MetaStructTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaStructTy";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";
import LifetimeAssignmentPragma from "@specs-feup/coral/pragma/lifetime/LifetimeAssignmentPragma";
import LfPath from "@specs-feup/coral/pragma/lifetime/path/LfPath";
import LfPathDeref from "@specs-feup/coral/pragma/lifetime/path/LfPathDeref";
import LfPathMemberAccess from "@specs-feup/coral/pragma/lifetime/path/LfPathMemberAccess";
import LfPathVarRef from "@specs-feup/coral/pragma/lifetime/path/LfPathVarRef";
import DefMap from "@specs-feup/coral/symbol/DefMap";

export function* numericMetaRegionGenerator(): Generator<MetaRegion, never, unknown> {
    let i = 0;
    while (true) {
        yield new MetaRegion(`%${i}`);
        i += 1;
    }
}

export function* alphabeticMetaRegionGenerator(blacklist: Set<string>): Generator<MetaRegion, never, unknown> {
    let i = 0;
    while (true) {
        let name = "";
        let j = i;
        while (j >= 0) {
            name = String.fromCharCode((j % 26) + 97) + name;
            j = Math.floor(j / 26) - 1;
        }
        const regionName = `%${name}`;
        if (!blacklist.has(regionName)) {
            yield new MetaRegion(regionName);
        }
        i += 1;
    }
}

export function* errorMetaRegionGenerator($field: Field): Generator<MetaRegion, never, unknown> {
    while (true) {
        throw new LifetimeExpectedError($field);
    }
}


class LifetimeAssignment {
    #relevantPragma: LifetimeAssignmentPragma;
    #path: LfPath;
    #metaRegion: MetaRegion;

    constructor(relevantPragma: LifetimeAssignmentPragma, path: LfPath, metaRegion: MetaRegion) {
        this.#relevantPragma = relevantPragma;
        this.#path = path;
        this.#metaRegion = metaRegion;
    }

    static fromPragma(pragma: LifetimeAssignmentPragma): LifetimeAssignment {
        return new LifetimeAssignment(pragma, pragma.lhs, new MetaRegion(pragma.rhs));
    }

    get path(): LfPath {
        return this.#path;
    }

    get unwrapDeref(): LifetimeAssignment | undefined {
        if (this.#path instanceof LfPathDeref) {
            return new LifetimeAssignment(this.#relevantPragma, this.#path.inner, this.#metaRegion);
        } else if (this.#path instanceof LfPathMemberAccess) {
            if (this.#path.inner instanceof LfPathDeref) {
                return new LifetimeAssignment(
                    this.#relevantPragma,
                    new LfPathMemberAccess(this.#path.inner.inner, this.#path.member),
                    this.#metaRegion
                );
            }
        } 
        return undefined;
    }

    get metaRegion(): MetaRegion {
        return this.#metaRegion;
    }

    get relevantPragma(): LifetimeAssignmentPragma {
        return this.#relevantPragma;
    }
}

export class MetaRegionMapper {
    #lifetimeAssignments: LifetimeAssignment[];
    #generator: Iterator<MetaRegion, never, void>;

    constructor(assignments: LifetimeAssignmentPragma[], generator: Iterator<MetaRegion, never, void>) {
        this.#lifetimeAssignments = assignments.map(LifetimeAssignment.fromPragma);
        this.#generator = generator;
    }

    get assignments(): LifetimeAssignment[] {
        return this.#lifetimeAssignments;
    }

    get hasAssignments(): boolean {
        return this.#lifetimeAssignments.length > 0;
    }

    generate(): MetaRegion {
        return this.#generator.next().value;
    }

    generateOuterRef() {
        const outer = this.#lifetimeAssignments.filter(
            (a) => a.unwrapDeref === undefined,
        );

        this.#lifetimeAssignments = this.#lifetimeAssignments
            .map((a) => a.unwrapDeref)
            .filter((a) => a !== undefined);

        for (const lf of outer) {
            if (lf.path instanceof LfPathMemberAccess) {
                throw new UnexpectedLifetimeAssignmentError(lf.relevantPragma);
            }
        }

        if (outer.length > 1) {
            throw new LifetimeReassignmentError(
                outer[0].relevantPragma,
                outer[1].relevantPragma,
            );
        }

        if (outer.length === 1) {
            return outer[0].metaRegion;
        }

        while (true) {
            return this.generate();
        }
    }
}


class ParseTypeContext {
    metaRegions: MetaRegionMapper;
    isConst: boolean;
    isRestrict: boolean;
    defMap: DefMap;

    constructor(mapper: MetaRegionMapper, defMap: DefMap) {
        this.metaRegions = mapper;
        this.isConst = false;
        this.isRestrict = false;
        this.defMap = defMap;
    }
}

export default class MetaTyParser {
    parse($type: Type, mapper: MetaRegionMapper, defMap: DefMap): MetaTy {
        return this.#parseMetaType($type, new ParseTypeContext(mapper, defMap));
    }

    #parseMetaType($type: Type, ctx: ParseTypeContext): MetaTy {
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
            return this.#parseMetaType($type.underlyingType, ctx);
        } else if ($type instanceof ElaboratedType) {
            return this.#parseMetaType($type.namedType, ctx);
        } else if ($type instanceof ParenType) {
            return this.#parseMetaType($type.innerType, ctx);
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

    #parseBuiltin(
        $type: BuiltinType | EnumDecl,
        name: string,
        ctx: ParseTypeContext,
    ): BuiltinTy {
        if (ctx.metaRegions.hasAssignments) {
            throw new UnexpectedLifetimeAssignmentError(ctx.metaRegions.assignments[0].relevantPragma);
        }
        return new BuiltinTy(name, $type, ctx.isConst);
    }

    #parsePointer($type: PointerType, ctx: ParseTypeContext): MetaRefTy {
        const outerRegion = ctx.metaRegions.generateOuterRef();

        const innerTy = this.#parseMetaType($type.pointee, new ParseTypeContext(ctx.metaRegions, ctx.defMap));
        
        // TODO `(*${newPragmaLhs})` for codegen
        if (innerTy.isConst && ctx.isRestrict) {
            throw new Error("Cannot have a restrict pointer to a const type");
        }

        return new MetaRefTy(outerRegion, innerTy, $type, ctx.isConst);
    }

    #parseStruct($decl: RecordJp, ctx: ParseTypeContext): MetaStructTy {
        const regions = new Map<string, MetaRegion>();
        for (const a of ctx.metaRegions.assignments) {
            if (!(a.path instanceof LfPathMemberAccess && a.path.inner instanceof LfPathVarRef)) {
                throw new UnexpectedLifetimeAssignmentError(a.relevantPragma);
            }
            regions.set(a.path.member, a.metaRegion);
        }
        
        const structDef = ctx.defMap.get($decl);
        for (const region of structDef.metaRegionVars) {
            if (!regions.has(region.name)) {
                // TODO `${newPragmaLhs}.${metaRegionVar.name}` for codegen
                regions.set(region.name, ctx.metaRegions.generate());
            }
        }

        return new MetaStructTy($decl, ctx.defMap, regions, ctx.isConst);
    }
}

import { Block } from "@bedfox/api/block";
import type { Definition } from "@bedfox/api/common";
import {
    AggregateFeature,
    CaveCarverFeature,
    ConditionalListFeature,
    FeatureRule,
    FossilFeature,
    GeodeFeature,
    GrowingPlantFeature,
    HeightDifferenceFilterFeature,
    HorizontalTreeDecorationFeature,
    MultiBlockFeature,
    MultifaceFeature,
    MultipartBlockColumnFeature,
    NetherCaveCarverFeature,
    OreFeature,
    PartiallyExposedBlobFeature,
    ScatterFeature,
    SearchFeature,
    SequenceFeature,
    SingleBlockFeature,
    SnapToSurfaceFeature,
    StructureTemplateFeature,
    SurfaceRelativeThresholdFeature,
    UnderwaterCaveCarverFeature,
    VegetationPatchFeature,
    WeightedRandomFeature,
} from "@bedfox/api/feature";

const IDENTIFIER_REG = /^[a-z0-9._-]+$/;

export function validateIdentifier(value: string): boolean {
    return IDENTIFIER_REG.test(value);
}
export class Registry {
    readonly namespace: string;

    #blocks = new DefinitionStore(Block);
    #featureRules = new DefinitionStore(FeatureRule);
    #features = new DefinitionStore(
        AggregateFeature,
        CaveCarverFeature,
        ConditionalListFeature,
        FossilFeature,
        GeodeFeature,
        GrowingPlantFeature,
        HeightDifferenceFilterFeature,
        HorizontalTreeDecorationFeature,
        MultiBlockFeature,
        MultifaceFeature,
        MultipartBlockColumnFeature,
        NetherCaveCarverFeature,
        OreFeature,
        PartiallyExposedBlobFeature,
        ScatterFeature,
        SearchFeature,
        SequenceFeature,
        SingleBlockFeature,
        SnapToSurfaceFeature,
        StructureTemplateFeature,
        SurfaceRelativeThresholdFeature,
        UnderwaterCaveCarverFeature,
        VegetationPatchFeature,
        WeightedRandomFeature,
    );

    constructor(namespace: string) {
        this.namespace = namespace;
    }

    add(...defs: Definition[]): this {
        for (const def of defs) {
            if (!validateIdentifier(def.identifier)) {
                throw new InvalidIdentifierError(def.identifier);
            }

            this.add(...def._resolveInstances());
            this.#storeFor(def).add(def);
        }
        return this;
    }

    remove(...defs: Definition[]): void {
        for (const def of defs) {
            this.#storeFor(def).delete(def);
        }
    }

    #storeFor(def: Definition): DefinitionStore {
        if (this.#blocks.is(def)) return this.#blocks;
        else if (this.#features.is(def)) return this.#features;
        else if (this.#featureRules.is(def)) return this.#featureRules;
        else throw new UnknownDefinitionError(def.constructor.name);
    }
}

type DefinitionCtor = abstract new (
    identifier: string,
    // deno-lint-ignore no-explicit-any
    props: Record<string, any>,
) => Definition;

class DefinitionStore {
    #inner = new Map<string, Definition>();
    #ctors: DefinitionCtor[];

    constructor(...ctors: DefinitionCtor[]) {
        this.#ctors = ctors;
    }

    is(def: Definition): boolean {
        for (const ctor of this.#ctors) {
            if (def instanceof ctor) return true;
        }
        return false;
    }

    add(def: Definition): this {
        const id = this.#idFor(def);

        // Skip already registered objects.
        const existing = this.#inner.get(id);
        if (existing === def) return this;
        if (existing !== undefined) throw new DuplicateDefinitionIdError(id);

        this.#inner.set(id, def);
        return this;
    }

    delete(def: Definition): void {
        this.#inner.delete(this.#idFor(def));
    }

    clear(): void {
        this.#inner.clear();
    }

    #idFor(def: Definition): string {
        if (this.#ctors.some((ctor) => def instanceof ctor)) {
            return def.identifier;
        }
        throw new UnknownDefinitionError(
            def.constructor.name,
            this.#ctors,
        );
    }
}

export class UnknownDefinitionError extends TypeError {
    constructor(defName: string, defCtors?: DefinitionCtor[]) {
        let msg = `Unknown definition: got ${defName}`;
        if (defCtors !== undefined) {
            msg += `, expected `;
            const expectedCtors = defCtors.map((ctor) => ctor.name).join(", ");
            if (defCtors.length > 1) msg += `one of ${expectedCtors}`;
            else msg += expectedCtors;
        }
        super(msg);
    }
}

export class DuplicateDefinitionIdError extends TypeError {
    constructor(id: string) {
        super(`Found duplicate definition identifier: ${id}`);
    }
}

export class InvalidIdentifierError extends TypeError {
    constructor(id: string) {
        super(`Invalid registry identifier: ${id}`);
    }
}

import { Block } from "@bedfox/api/block";
import {
    type Component,
    type Definition,
    type ReferenceTarget,
    Relation,
} from "@bedfox/api/common";
import {
    AggregateFeature,
    CaveCarverFeature,
    ConditionalListFeature,
    FeatureRules,
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
import { autoIdentifier } from "./_utils.ts";

const IDENTIFIER_REG = /^[a-z0-9._-]+$/;

export function validateIdentifier(value: string): boolean {
    return IDENTIFIER_REG.test(value);
}

// Assigned in Registry's static block so that Query can reach the Registry's
// internals without them being public.
let internals: {
    all(reg: Registry): Iterable<Definition>;
    get(
        reg: Registry,
        ctor: DefinitionCtor,
        id: string,
    ): Definition | undefined;
    stripNamespace(reg: Registry, id: string): string;
    isReferenced(reg: Registry, def: Definition): boolean;
};

export class Registry {
    readonly namespace: string;

    #blocks = new DefinitionStore(Block);
    #featureRules = new DefinitionStore(FeatureRules);
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

    #stores = [this.#blocks, this.#features, this.#featureRules];
    #systems = new Map<Schedule, System[]>();
    #referenced?: Set<string>;

    static {
        internals = {
            all: (reg) => reg.#all(),
            get: (reg, ctor, id) => reg.#get(ctor, id),
            stripNamespace: (reg, id) => reg.#stripNamespace(id),
            isReferenced: (reg, def) => reg.#isReferenced(def),
        };
    }

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
        this.#referenced = undefined;
        return this;
    }

    remove(...defs: Definition[]): void {
        for (const def of defs) {
            this.#storeFor(def).delete(def);
        }
        this.#referenced = undefined;
    }

    addSystem(schedule: Schedule, ...systems: System[]): this;
    addSystem(...systems: System[]): this;
    addSystem(firstArg: Schedule | System, ...restArgs: System[]): this {
        const [schedule, systems] = typeof firstArg === "number"
            ? [firstArg, restArgs]
            : [Schedule.Transform, [firstArg, ...restArgs]];
        const list = this.#systems.get(schedule) ?? [];
        list.push(...systems);
        this.#systems.set(schedule, list);
        return this;
    }

    run(): void {
        for (
            const schedule of [
                Schedule.Setup,
                Schedule.Transform,
                Schedule.Finalize,
            ]
        ) {
            for (const system of this.#systems.get(schedule) ?? []) {
                // Systems may mutate references, so we recompute lazily per-system.
                this.#referenced = undefined;
                system(this);
            }
        }
    }

    *#all(): Generator<Definition, void, unknown> {
        for (const store of this.#stores) yield* store.values();
    }

    #get(ctor: DefinitionCtor, id: string): Definition | undefined {
        const localId = this.#stripNamespace(id);
        for (const store of this.#stores) {
            const def = store.get(localId);
            if (def instanceof ctor) return def;
        }
    }

    #stripNamespace(id: string): string {
        const prefix = `${this.namespace}:`;
        return id.startsWith(prefix) ? id.slice(prefix.length) : id;
    }

    #isReferenced(def: Definition): boolean {
        this.#referenced ??= new Set(
            Iterator.from(this.#all()).flatMap((def) =>
                def._references().map((ref) =>
                    this.#stripNamespace(autoIdentifier(ref.target))
                )
            ),
        );
        return this.#referenced.has(def.identifier);
    }

    #storeFor(def: Definition): DefinitionStore {
        const store = this.#stores.find((store) => store.is(def));
        if (store === undefined) {
            throw new UnknownDefinitionError(def.constructor.name);
        }
        return store;
    }
}

export const enum Schedule {
    Setup,
    Transform,
    Finalize,
}

export type SystemCallback<T extends Definition[]> = (
    reg: Registry,
    defs: Generator<T[number], void, unknown>,
) => void;

export type System = (reg: Registry) => void;

export type Filter<T extends Definition = Definition> = (
    def: T,
    reg: Registry,
) => boolean;

export class Query<T extends Definition[]> {
    #ctors: DefinitionCtor<T[number]>[];
    #filters: Filter<T[number]>[] = [];

    constructor(...ctors: { [K in keyof T]: DefinitionCtor<T[K]> }) {
        this.#ctors = ctors;
    }

    static where<T extends Definition>(predicate: Filter<T>): Filter<T> {
        return predicate;
    }

    static withComponent(...ctors: ComponentCtor[]): Filter<Block> {
        return (def) => def.components.has(...ctors);
    }

    static withoutComponent(...ctors: ComponentCtor[]): Filter<Block> {
        return (def) => !ctors.some((ctor) => def.components.has(ctor));
    }

    static references(target: DefinitionCtor | ReferenceTarget): Filter {
        return referencing(target);
    }

    static placing(target: DefinitionCtor | ReferenceTarget): Filter {
        return referencing(target, Relation.Places);
    }

    static requiring(target: DefinitionCtor | ReferenceTarget): Filter {
        return referencing(target, Relation.Requires);
    }

    static orphan(): Filter {
        return (def, reg) => !internals.isReferenced(reg, def);
    }

    filter(...filters: Filter<T[number]>[]): Query<T> {
        const query = new Query<T>(
            ...this.#ctors as { [K in keyof T]: DefinitionCtor<T[K]> },
        );
        query.#filters = [...this.#filters, ...filters];
        return query;
    }

    system(callback: SystemCallback<T>): System {
        return (reg) => callback(reg, this.#run(reg));
    }

    *#run(reg: Registry): Generator<T[number], void, unknown> {
        for (const def of internals.all(reg)) {
            if (
                this.#ctors.some((ctor) => def instanceof ctor) &&
                this.#filters.every((filter) => filter(def as T[number], reg))
            ) yield def as T[number];
        }
    }
}

function referencing(
    target: DefinitionCtor | ReferenceTarget,
    relation?: Relation,
): Filter {
    return (def, reg) =>
        def._references().some((ref) => {
            if (relation !== undefined && ref.relation !== relation) {
                return false;
            }

            const id = autoIdentifier(ref.target);
            if (typeof target === "function") {
                return internals.get(reg, target, id) !== undefined;
            } else {
                return internals.stripNamespace(reg, id) ===
                    internals.stripNamespace(reg, autoIdentifier(target));
            }
        });
}

type ComponentCtor = abstract new (...args: never[]) => Component;

type DefinitionCtor<T extends Definition = Definition> = abstract new (
    ...args: never[]
) => T;

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

    get(id: string): Definition | undefined {
        return this.#inner.get(id);
    }

    values(): IterableIterator<Definition> {
        return this.#inner.values();
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

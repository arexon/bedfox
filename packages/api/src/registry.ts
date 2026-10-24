import { Block } from "#/block/index";
import type { ComponentCtor } from "#/core/component";
import {
    Definition,
    type DefinitionCtor,
    type Reference,
    type ReferenceTarget,
} from "#/core/definition";
import { autoIdentifier } from "#/core/references";
import { Feature, type FeatureReference } from "#/feature/base";
import { FeatureRules } from "#/feature/rules";
import type { BlockDescriptorRef } from "#/primitive/index";

export class Registry {
    readonly namespace: string;

    #blocks = new DefinitionStore(Block);
    #featureRules = new DefinitionStore(FeatureRules);
    #features = new DefinitionStore(Feature);

    #stores = [this.#blocks, this.#features, this.#featureRules];
    #systems = new Map<Schedule, System[]>();
    #referenced?: Map<string, Reference[]>;

    constructor(namespace: string) {
        this.namespace = namespace;
    }

    add(...defs: Definition[]): this {
        for (const def of defs) {
            if (!validateIdentifier(def.identifier)) {
                throw new InvalidIdentifierError(def.identifier);
            }

            this.add(...def._referencedInstances());
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
        const [schedule, systems]: [Schedule, System[]] =
            typeof firstArg === "string"
                ? [firstArg, restArgs]
                : ["transform", [firstArg, ...restArgs]];
        const list = this.#systems.get(schedule) ?? [];
        list.push(...systems);
        this.#systems.set(schedule, list);
        return this;
    }

    run(): void {
        for (const schedule of SCHEDULES) {
            for (const system of this.#systems.get(schedule) ?? []) {
                // Systems may mutate references, so we recompute lazily per-system.
                this.#referenced = undefined;
                system(this);
            }
        }
    }

    /** @yields Each registered {@link Definition}, by kind then insertion order. */
    *all(): Generator<Definition, void, unknown> {
        for (const store of this.#stores) yield* store.values();
    }

    /** Looks up a definition by class and identifier, with or without this registry's namespace. */
    resolve<T extends Definition>(ctor: DefinitionCtor<T>, id: string): T | undefined {
        const localId = this.#stripNamespace(id);
        for (const store of this.#stores) {
            const def = store.get(localId);
            if (def instanceof ctor) return def;
        }
        return undefined;
    }

    /**
     * Whether a reference refers to {@link target}: a registered instance of the given class, or the
     * same identifier ignoring this registry's namespace. Definitions must also be of
     * {@link Reference.kind}.
     */
    matches(ref: Reference, target: DefinitionCtor | ReferenceTarget): boolean {
        const id = autoIdentifier(ref.target);
        if (typeof target === "function") {
            return this.resolve(ref.kind, id) instanceof target;
        }
        if (target instanceof Definition && !(target instanceof ref.kind)) return false;
        return this.#stripNamespace(id) === this.#stripNamespace(autoIdentifier(target));
    }

    #stripNamespace(id: string): string {
        const prefix = `${this.namespace}:`;
        return id.startsWith(prefix) ? id.slice(prefix.length) : id;
    }

    /** Whether any registered definition references {@link def}. */
    isReferenced(def: Definition): boolean {
        this.#referenced ??= Map.groupBy(
            Iterator.from(this.all()).flatMap((def) => def._references()),
            (ref) => this.#stripNamespace(autoIdentifier(ref.target)),
        );
        const refs = this.#referenced.get(def.identifier) ?? [];
        return refs.some((ref) => def instanceof ref.kind);
    }

    #storeFor(def: Definition): DefinitionStore {
        const store = this.#stores.find((store) => store.is(def));
        if (store === undefined) {
            throw new UnknownDefinitionError(def.constructor.name);
        }
        return store;
    }
}

const IDENTIFIER_REG = /^[a-z0-9._-]+$/;

function validateIdentifier(value: string): boolean {
    return IDENTIFIER_REG.test(value);
}

/** When a system runs: setup, then transform, then finalize. */
export type Schedule = "setup" | "transform" | "finalize";

const SCHEDULES: readonly Schedule[] = ["setup", "transform", "finalize"];

export type Defs = [Definition, ...Definition[]];

export type Filter<T extends Definition = Definition> = (def: T, reg: Registry) => boolean;

export type System = (reg: Registry) => void;

export type SystemCallback<T extends Definition> = (
    reg: Registry,
    defs: Generator<T, void, unknown>,
) => void;

/** Whether a query over `T` could yield a `K`, either as a subclass or as one of its bases. */
type Overlaps<T, K> = [Extract<T, K>] extends [never] ? (K extends T ? true : false) : true;

interface BaseQuery<T extends Definition> {
    filter(...filters: Filter<T>[]): Query<T>;

    /** Matches definitions nothing else in the registry references. */
    orphan(): Query<T>;

    intoSystem(callback: SystemCallback<T>): System;
}

// Kind filters only apply to their kind and let other kinds through, so they can be mixed.

interface BlockQuery<T extends Definition> {
    /** Matches blocks that have every given component. */
    withComponent(first: ComponentCtor, ...rest: ComponentCtor[]): Query<T>;

    /** Matches blocks that have none of the given components. */
    withoutComponent(first: ComponentCtor, ...rest: ComponentCtor[]): Query<T>;
}

interface FeatureQuery<T extends Definition> {
    /** Matches features and feature rules that place `target`. */
    placing(
        target: DefinitionCtor<Block | Feature> | Block | FeatureReference | BlockDescriptorRef,
    ): Query<T>;
}

interface FeatureRulesQuery<T extends Definition> {
    /** Matches feature rules that place `target`. */
    placing(target: DefinitionCtor<Feature> | FeatureReference): Query<T>;
}

/** A query over `T`, with the filters of every kind it could yield. */
export type Query<T extends Definition> = BaseQuery<T> &
    (Overlaps<T, Block> extends true ? BlockQuery<T> : unknown) &
    (Overlaps<T, Feature> extends true
        ? FeatureQuery<T>
        : Overlaps<T, FeatureRules> extends true
          ? FeatureRulesQuery<T>
          : unknown);

/** Queries registered definitions of the given classes. */
export function query<T extends Defs>(
    ...ctors: { [K in keyof T]: DefinitionCtor<T[K]> }
): Query<T[number]> {
    return new QueryImpl(ctors, []);
}

class QueryImpl {
    #ctors: DefinitionCtor[];
    #filters: Filter[];

    constructor(ctors: DefinitionCtor[], filters: Filter[]) {
        this.#ctors = ctors;
        this.#filters = filters;
    }

    filter(...filters: Filter[]): QueryImpl {
        return new QueryImpl(this.#ctors, [...this.#filters, ...filters]);
    }

    orphan(): QueryImpl {
        return this.filter((def, reg) => !reg.isReferenced(def));
    }

    withComponent(first: ComponentCtor, ...rest: ComponentCtor[]): QueryImpl {
        return this.filter((def) => !(def instanceof Block) || def.components.has(first, ...rest));
    }

    withoutComponent(first: ComponentCtor, ...rest: ComponentCtor[]): QueryImpl {
        const ctors = [first, ...rest];
        return this.filter(
            (def) => !(def instanceof Block) || !ctors.some((ctor) => def.components.has(ctor)),
        );
    }

    placing(target: DefinitionCtor | ReferenceTarget): QueryImpl {
        return this.filter(
            (def, reg) =>
                !(def instanceof Feature || def instanceof FeatureRules) ||
                def._placements().some((ref) => reg.matches(ref, target)),
        );
    }

    intoSystem(callback: SystemCallback<Definition>): System {
        return (reg) => callback(reg, this.#run(reg));
    }

    *#run(reg: Registry): Generator<Definition, void, unknown> {
        for (const def of reg.all()) {
            if (
                this.#ctors.some((ctor) => def instanceof ctor) &&
                this.#filters.every((filter) => filter(def, reg))
            ) {
                yield def;
            }
        }
    }
}

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
        const id = this.#idFor(def);
        if (this.#inner.get(id) === def) this.#inner.delete(id);
    }

    clear(): void {
        this.#inner.clear();
    }

    #idFor(def: Definition): string {
        if (this.#ctors.some((ctor) => def instanceof ctor)) {
            return def.identifier;
        }
        throw new UnknownDefinitionError(def.constructor.name, this.#ctors);
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
        this.name = "UnknownDefinitionError";
    }
}

export class DuplicateDefinitionIdError extends TypeError {
    constructor(id: string) {
        super(`Found duplicate definition identifier: ${id}`);
        this.name = "DuplicateDefinitionIdError";
    }
}

export class InvalidIdentifierError extends TypeError {
    constructor(id: string) {
        super(`Invalid registry identifier: ${id}`);
        this.name = "InvalidIdentifierError";
    }
}

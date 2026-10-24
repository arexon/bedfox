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

/** The schedules a registry has unless it's given its own, in run order. */
export const DEFAULT_SCHEDULES = ["setup", "transform", "finalize"] as const;

export interface RegistryOptions<S extends string, D extends S = never> {
    /**
     * The schedules systems can run on, in run order.
     *
     * @default ["setup", "transform", "finalize"]
     */
    schedules?: readonly S[];
    /**
     * The schedule for systems added without one.
     *
     * @default "transform"
     */
    defaultSchedule?: D;
}

/**
 * Holds a project's definitions and the systems that transform them.
 *
 * Definitions are registered by identifier without a namespace, e.g. `dirt`. References to them may
 * use either form, e.g. `dirt` or `example:dirt`.
 *
 * @example
 *     const reg = new Registry("example").add(new Block("dirt"));
 *     // Remove features that nothing places.
 *     reg.addSystem(
 *         "finalize",
 *         query(Feature)
 *             .orphan()
 *             .intoSystem((reg, features) => reg.remove(...features)),
 *     );
 *     reg.run();
 */
export class Registry<S extends string = (typeof DEFAULT_SCHEDULES)[number], D extends S = never> {
    /** The namespace of this registry's definitions, e.g. `example` in `example:dirt`. */
    readonly namespace: string;

    #blocks = new DefinitionStore(Block);
    #featureRules = new DefinitionStore(FeatureRules);
    #features = new DefinitionStore(Feature);

    #stores = [this.#blocks, this.#features, this.#featureRules];
    #schedules: ReadonlySet<string>;
    #defaultSchedule: string;
    #systems = new Map<string, System[]>();
    #referenced?: Map<string, Reference[]>;

    /**
     * Creates a registry for definitions in `namespace`.
     *
     * @example
     *     const reg = new Registry("example");
     *     reg.addSystem("setup", (reg) => reg.add(new Block("dirt")));
     *
     * @throws - {@link DuplicateScheduleError} if a schedule is listed more than once.
     * @throws - {@link UnknownScheduleError} if `defaultSchedule` isn't one of the schedules.
     */
    constructor(namespace: string, options: RegistryOptions<S, D> = {}) {
        this.namespace = namespace;
        const schedules = new Set<string>();
        for (const schedule of options.schedules ?? DEFAULT_SCHEDULES) {
            if (schedules.has(schedule)) throw new DuplicateScheduleError(schedule);
            schedules.add(schedule);
        }
        this.#schedules = schedules;
        this.#defaultSchedule = options.defaultSchedule ?? "transform";
        if (options.defaultSchedule !== undefined && !schedules.has(options.defaultSchedule)) {
            throw new UnknownScheduleError(options.defaultSchedule);
        }
    }

    /**
     * Registers definitions, along with any definition instances they reference. Adding an instance
     * that's already registered does nothing.
     *
     * @example
     *     const ore = new OreFeature("dirt_ore").add("example:dirt", ["minecraft:stone"]);
     *     // Registers `dirt_ore` too, since `scatter` holds the instance.
     *     reg.add(new ScatterFeature("scatter", { placesFeature: ore }));
     *
     * @throws - {@link InvalidIdentifierError} if an identifier has a namespace or characters other
     *   than `a-z`, `0-9`, `.`, `_` and `-`.
     * @throws - {@link DuplicateDefinitionIdError} if another instance of the same kind has the
     *   same identifier.
     * @throws - {@link UnknownDefinitionError} if a definition's kind can't be registered.
     */
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

    /**
     * Unregisters definitions. Removing an instance that isn't registered does nothing, even if
     * another instance has its identifier. Definitions they reference stay registered.
     *
     * @throws - {@link UnknownDefinitionError} if a definition's kind can't be registered.
     */
    remove(...defs: Definition[]): void {
        for (const def of defs) {
            this.#storeFor(def).delete(def);
        }
        this.#referenced = undefined;
    }

    /**
     * Adds systems to run on `schedule`.
     *
     * @example
     *     reg.addSystem("setup", (reg) => reg.add(new Block("dirt")));
     *
     * @throws - {@link UnknownScheduleError} if no schedule is called `schedule`.
     */
    addSystem(schedule: S, ...systems: System[]): this;
    /**
     * Adds systems to run on the default schedule, `transform` unless the registry was given
     * another.
     *
     * @example
     *     reg.addSystem((reg) => {
     *         reg.resolve(Block, "dirt")?.setComponent(new FrictionBlockComponent(0.4));
     *     });
     */
    addSystem(
        ...systems: [D] extends [never] ? ("transform" extends S ? System[] : never[]) : System[]
    ): this;
    addSystem(...args: unknown[]): this {
        const [schedule, systems] =
            typeof args[0] === "string"
                ? [args[0], args.slice(1) as System[]]
                : [this.#defaultSchedule, args as System[]];
        if (!this.#schedules.has(schedule)) throw new UnknownScheduleError(schedule);
        const list = this.#systems.get(schedule) ?? [];
        list.push(...systems);
        this.#systems.set(schedule, list);
        return this;
    }

    /** Runs every system, schedule by schedule, in the order they were added. */
    run(): void {
        for (const schedule of this.#schedules) {
            for (const system of this.#systems.get(schedule) ?? []) {
                // A system may change what references what, so drop the cached references
                // before each one and rebuild them on demand.
                this.#referenced = undefined;
                system(this, schedule);
            }
        }
    }

    /** @yields Each registered {@link Definition}, by kind then insertion order. */
    *all(): Generator<Definition, void, unknown> {
        for (const store of this.#stores) yield* store.values();
    }

    /**
     * Looks up a definition by class and identifier, with or without this registry's namespace.
     *
     * @example
     *     reg.resolve(Block, "dirt");
     *     reg.resolve(Block, "example:dirt"); // Same block.
     */
    resolve<T extends Definition>(ctor: DefinitionCtor<T>, id: string): T | undefined {
        const localId = this.#stripNamespace(id);
        for (const store of this.#stores) {
            const def = store.get(localId);
            if (def instanceof ctor) return def;
        }
        return undefined;
    }

    /**
     * Whether `ref` points at `target`. A class matches when `ref` resolves to a registered
     * instance of it. Anything else matches by identifier, ignoring this registry's namespace, and
     * a definition must also be an instance of {@link Reference.kind}.
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

    /** Whether any registered definition references `def`. */
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

/** Whether a query keeps `def`. */
export type Filter<T extends Definition = Definition> = (def: T, reg: Registry<string>) => boolean;

/** A function that {@link Registry.run()} calls. */
export type System = (reg: Registry<string>, schedule: string) => void;

/** A system that receives the definitions its query matched. */
export type SystemCallback<T extends Definition> = (
    reg: Registry<string>,
    defs: Generator<T, void, unknown>,
    schedule: string,
) => void;

/** Whether a query over `T` could yield a `K`: some member of `T` is a `K`, or `K` extends `T`. */
type Overlaps<T, K> = [Extract<T, K>] extends [never] ? (K extends T ? true : false) : true;

interface BaseQuery<T extends Definition> {
    /**
     * Matches definitions that pass every filter.
     *
     * @example
     *     query(Block).filter((block) => block.identifier.endsWith("_ore"));
     */
    filter(...filters: Filter<T>[]): Query<T>;

    /** Matches definitions nothing else in the registry references. */
    orphan(): Query<T>;

    /**
     * Turns the query into a system that calls `callback` with the definitions matched when it
     * runs. If nothing matches, `callback` isn't called.
     *
     * @example
     *     reg.addSystem(
     *         query(Block).intoSystem((reg, blocks) => {
     *             for (const block of blocks) {
     *                 block.setComponent(new LightEmissionBlockComponent(15));
     *             }
     *         }),
     *     );
     */
    intoSystem(callback: SystemCallback<T>): System;
}

// Each kind's filters let definitions of other kinds through, so one query can mix kinds.

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

/**
 * Queries registered definitions of the given classes. Filters only become available for the kinds
 * the query can yield.
 *
 * @example
 *     query(Block).withComponent(LightEmissionBlockComponent);
 *     query(Feature, FeatureRules).placing(Block);
 */
export function query<T extends [Definition, ...Definition[]]>(
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
        return (reg, schedule) => {
            const defs = this.#run(reg);
            const first = defs.next();
            if (first.done) return;
            callback(reg, this.#withFirst(reg, first.value, defs), schedule);
        };
    }

    /**
     * @yields `first` if it still matches once iteration starts, then everything in `rest`. The
     *   callback may have changed the registry since `first` was matched.
     */
    *#withFirst(
        reg: Registry<string>,
        first: Definition,
        rest: Iterable<Definition>,
    ): Generator<Definition, void, unknown> {
        const ctor = first.constructor as DefinitionCtor;
        if (reg.resolve(ctor, first.identifier) === first && this.#matches(first, reg)) {
            yield first;
        }
        yield* rest;
    }

    *#run(reg: Registry<string>): Generator<Definition, void, unknown> {
        for (const def of reg.all()) {
            if (this.#matches(def, reg)) yield def;
        }
    }

    #matches(def: Definition, reg: Registry<string>): boolean {
        return (
            this.#ctors.some((ctor) => def instanceof ctor) &&
            this.#filters.every((filter) => filter(def, reg))
        );
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

        // Adding the same instance again is a no-op.
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

/** An error caused by a definition of a kind the registry can't hold. */
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

/** An error caused by two instances of the same kind with the same identifier. */
export class DuplicateDefinitionIdError extends TypeError {
    constructor(id: string) {
        super(`Found duplicate definition identifier: ${id}`);
        this.name = "DuplicateDefinitionIdError";
    }
}

/** An error caused by a schedule listed more than once. */
export class DuplicateScheduleError extends TypeError {
    constructor(name: string) {
        super(`Found duplicate schedule: ${name}`);
        this.name = "DuplicateScheduleError";
    }
}

/** An error caused by a schedule name the registry doesn't have. */
export class UnknownScheduleError extends TypeError {
    constructor(name: string) {
        super(`Unknown schedule: ${name}`);
        this.name = "UnknownScheduleError";
    }
}

/** An error caused by an identifier the registry doesn't accept. */
export class InvalidIdentifierError extends TypeError {
    constructor(id: string) {
        super(`Invalid registry identifier: ${id}`);
        this.name = "InvalidIdentifierError";
    }
}

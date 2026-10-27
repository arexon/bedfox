import { Block } from "#/block/index";
import type { ComponentCtor } from "#/core/component";
import {
    Definition,
    type DefinitionCtor,
    NAMESPACE,
    type Reference,
    type ReferenceTarget,
} from "#/core/definition";
import type { PackKind } from "#/core/output";
import { autoIdentifier } from "#/core/references";
import { Feature, type FeatureReference } from "#/feature/base";
import { FeatureRules } from "#/feature/rules";
import { Manifest } from "#/manifest/index";
import { DataModule, ResourcesModule } from "#/manifest/module";
import type { BlockDescriptorRef } from "#/primitive/index";

/** The schedules a registry has unless it's given its own, in run order. */
export const DEFAULT_SCHEDULES = ["setup", "transform", "finalize"] as const;

export interface RegistryOptions<S extends string, D extends S = never> {
    /** The namespace of the registry. */
    namespace: string;
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

/** A registry's pack manifests. */
export interface RegistryManifests {
    readonly bp: Manifest;
    readonly rp: Manifest;
}

/**
 * Holds a project's definitions and the systems that transform them.
 *
 * Definitions are registered by identifier without a namespace, e.g. `dirt`. References to them may
 * use either form, e.g. `dirt` or `example:dirt`.
 *
 * @example
 *     const reg = new Registry({ namespace: "example" });
 *     reg.add(new Block("dirt"));
 *     // Remove features that nothing places.
 *     reg.addSystem(
 *         "finalize",
 *         query(Feature)
 *             .orphan()
 *             .intoSystem((reg, features) => reg.remove(...features)),
 *     );
 *     await reg.run();
 */
export class Registry<S extends string = (typeof DEFAULT_SCHEDULES)[number], D extends S = never> {
    /** The namespace of this registry's definitions, e.g. `example` in `example:dirt`. */
    readonly namespace: string;

    /** The behavior and resource pack manifests. */
    readonly manifests: RegistryManifests;

    #members = new Set<Definition>();
    #schedules: ReadonlySet<string>;
    #defaultSchedule: string;
    #systems = new Map<string, System[]>();
    #referenced?: Map<string, Reference[]>;
    #byIdentifier?: Map<string, Definition[]>;
    #byPath: Record<PackKind, Map<string, Definition>> = {
        behavior: new Map(),
        resource: new Map(),
    };

    /**
     * Creates a registry.
     *
     * @throws - {@link DuplicateScheduleError} if a schedule is listed more than once.
     * @throws - {@link UnknownScheduleError} if `defaultSchedule` isn't one of the schedules.
     */
    constructor(options: RegistryOptions<S, D>) {
        const { namespace } = options;
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

        const rp = new Manifest(namespace).module(new ResourcesModule());
        const bp = new Manifest(namespace).module(new DataModule()).dependsOn(rp);
        this.manifests = { bp, rp };
    }

    /**
     * Registers definitions, along with any definition instances they reference. A definition
     * belongs to one registry at a time, and serializes with its namespace, e.g. `example:dirt`.
     * Adding a definition that's already here does nothing. Definitions of different kinds, such as
     * a block and a feature, may share an identifier.
     *
     * @example
     *     const ore = new OreFeature("dirt_ore").add("example:dirt", ["minecraft:stone"]);
     *     // Registers `dirt_ore` too, since `scatter` holds the instance.
     *     reg.add(new ScatterFeature("scatter", { placesFeature: ore }));
     *
     * @throws - {@link AlreadyRegisteredError} if a definition is in another registry.
     * @throws - {@link DuplicateIdentifierError} if another definition here would be written to the
     *   same file, e.g. a second block called `dirt`.
     */
    add(...defs: Definition[]): this {
        for (const def of defs) {
            if (this.#members.has(def)) continue;
            const namespace = def[NAMESPACE];
            if (namespace !== undefined)
                throw new AlreadyRegisteredError(def.identifier, namespace);
            const paths = this.#byPath[def.kind];
            const taken = paths.get(def.path);
            if (taken !== undefined) throw new DuplicateIdentifierError(taken, def);
            // Registered before its references, so a reference cycle ends here.
            paths.set(def.path, def);
            this.#members.add(def);
            def[NAMESPACE] = this.namespace;
            try {
                this.add(...def._referencedInstances());
            } catch (error) {
                this.remove(def);
                throw error;
            }
        }
        this.#invalidate();
        return this;
    }

    /**
     * Unregisters definitions, which then serialize without a namespace and can be added to another
     * registry. Removing a definition that isn't here does nothing. Definitions they reference stay
     * registered.
     */
    remove(...defs: Definition[]): void {
        for (const def of defs) {
            if (!this.#members.delete(def)) continue;
            delete def[NAMESPACE];
            this.#byPath[def.kind].delete(def.path);
        }
        this.#invalidate();
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
     *         for (const dirt of reg.resolve(Block, "dirt")) {
     *             dirt.setComponent(new FrictionBlockComponent(0.4));
     *         }
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

    /**
     * Runs every system, schedule by schedule, in the order they were added. Each system finishes,
     * including any promise it returns, before the next one starts.
     */
    async run(): Promise<void> {
        for (const schedule of this.#schedules) {
            for (const system of this.#systems.get(schedule) ?? []) {
                // A system may change what references what, so drop the caches before each one and
                // rebuild them on demand.
                this.#invalidate();
                // Systems run one at a time, since each may depend on what earlier ones changed.
                // oxlint-disable-next-line no-await-in-loop
                await system(this, schedule);
            }
        }
    }

    /**
     * @yields Each {@link Definition} registered when iteration starts, in the order they were
     *   added. Definitions added while iterating aren't yielded, and those removed are skipped.
     */
    *all(): Generator<Definition, void, unknown> {
        const snapshot = Array.from(this.#members);
        for (const def of snapshot) {
            if (this.#members.has(def)) yield def;
        }
    }

    /**
     * Looks up definitions by class and identifier, with or without this registry's namespace, in
     * the order they were added. Only one definition can be written to each file, so a class like
     * `Block` finds at most one, while a base class like `Definition` may find a block and a
     * feature.
     *
     * @example
     *     reg.resolve(Block, "dirt"); // [dirt]
     *     reg.resolve(Block, "example:dirt"); // Same block.
     */
    resolve<T extends Definition>(ctor: DefinitionCtor<T>, id: string): T[] {
        this.#byIdentifier ??= Map.groupBy(this.#members, (def) => def.identifier);
        const defs = this.#byIdentifier.get(this.#stripNamespace(id)) ?? [];
        return defs.filter((def): def is T => def instanceof ctor);
    }

    /**
     * Whether `ref` points at `target`. A class matches when `ref` resolves to a registered
     * instance of it. Anything else matches by identifier, ignoring this registry's namespace, and
     * a definition must also be an instance of {@link Reference.ctor}.
     */
    matches(ref: Reference, target: DefinitionCtor | ReferenceTarget): boolean {
        const id = autoIdentifier(ref.target);
        if (typeof target === "function") {
            return this.resolve(ref.ctor, id).some((def) => def instanceof target);
        }
        if (target instanceof Definition && !(target instanceof ref.ctor)) return false;
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
        return refs.some((ref) => def instanceof ref.ctor);
    }

    #invalidate(): void {
        this.#referenced = undefined;
        this.#byIdentifier = undefined;
    }
}

/** Whether a query keeps `def`. */
export type Filter<T extends Definition = Definition> = (def: T, reg: Registry<string>) => boolean;

/**
 * A function that {@link Registry.run()} calls. If it returns a promise, the run waits for it before
 * starting the next system. Any other return value is ignored.
 */
export type System = (reg: Registry<string>, schedule: string) => unknown;

/** A system that receives the definitions its query matched. */
export type SystemCallback<T extends Definition> = (
    reg: Registry<string>,
    defs: Generator<T, void, unknown>,
    schedule: string,
) => unknown;

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
            if (first.done) return undefined;
            return callback(reg, this.#withFirst(reg, first.value, defs), schedule);
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
        if (reg.resolve(ctor, first.identifier).includes(first) && this.#matches(first, reg)) {
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

/** An error caused by adding a definition that another registry holds. */
export class AlreadyRegisteredError extends TypeError {
    constructor(id: string, namespace: string) {
        super(
            `Definition ${id} is already in the ${namespace} registry, remove it from there first`,
        );
        this.name = "AlreadyRegisteredError";
    }
}

/** An error caused by adding a definition that would be written to the same file as another. */
export class DuplicateIdentifierError extends TypeError {
    constructor(existing: Definition, added: Definition) {
        super(
            `Can't add ${added.constructor.name} ${added.identifier}, ${existing.constructor.name} ${existing.identifier} is already written to ${existing.path} in the ${existing.kind} pack`,
        );
        this.name = "DuplicateIdentifierError";
    }
}

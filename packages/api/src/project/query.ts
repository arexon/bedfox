import { Block } from "#/block/index";
import type { ComponentCtor } from "#/core/component";
import type { Definition, DefinitionCtor, ReferenceTarget } from "#/core/definition";
import { Feature, type FeatureReference } from "#/feature/base";
import { FeatureRules } from "#/feature/rules";
import type { BlockDescriptorRef } from "#/primitive/index";
import type { Registry } from "#/project/registry";
import type { PreparedSystem, System } from "#/project/system";

/** Whether a query keeps `def`. */
export type Filter<T extends Definition = Definition> = (def: T, reg: Registry) => boolean;

/** The callback of {@link Query.intoSystem}. It gets the matched definitions. */
export type SystemCallback<T extends Definition> = (
    reg: Registry,
    defs: Generator<T, void, unknown>,
) => void | Promise<void>;

/** The callback of {@link Query.intoPreparedSystem}. It gets the matched definitions and the data. */
export type PreparedSystemCallback<T extends Definition, D> = (
    reg: Registry,
    defs: Generator<T, void, unknown>,
    data: D,
) => void | Promise<void>;

type Overlaps<T, K> = [Extract<T, K>] extends [never] ? (K extends T ? true : false) : true;

interface BaseQuery<T extends Definition> {
    /**
     * Matches definitions that pass every filter.
     *
     * @example
     *     query(Block).filter((block) => block.identifier.endsWith("_ore"));
     */
    filter(...filters: Filter<T>[]): Query<T>;

    /** Matches definitions that nothing in the registry references. */
    orphan(): Query<T>;

    /**
     * Converts the query to a system.
     *
     * If nothing matches, the system doesn't call `callback`.
     *
     * @example
     *     project.addSystem(
     *         query(Block).intoSystem((reg, blocks) => {
     *             for (const block of blocks) {
     *                 block.setComponent(new LightEmissionBlockComponent(15));
     *             }
     *         }),
     *     );
     */
    intoSystem(callback: SystemCallback<T>): System;

    /**
     * Converts the query to a {@link PreparedSystem}.
     *
     * If nothing matches, the system doesn't call `callback`, but `prepare` still runs.
     *
     * @example
     *     project.addSystem(
     *         query(Block).intoPreparedSystem(
     *             () => readColors(),
     *             (reg, blocks, colors) => {
     *                 for (const block of blocks) paint(block, colors);
     *             },
     *         ),
     *     );
     */
    intoPreparedSystem<D>(
        prepare: () => Promise<D>,
        callback: PreparedSystemCallback<T, D>,
    ): PreparedSystem<D>;
}

// Each kind's filters keep definitions of other kinds, so one query can mix kinds.

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

/** A query for definitions of type `T`. {@link query} creates one. */
export type Query<T extends Definition> = BaseQuery<T> &
    (Overlaps<T, Block> extends true ? BlockQuery<T> : unknown) &
    (Overlaps<T, Feature> extends true
        ? FeatureQuery<T>
        : Overlaps<T, FeatureRules> extends true
          ? FeatureRulesQuery<T>
          : unknown);

/**
 * Finds registered definitions of the given classes.
 *
 * A query has only the filters of the kinds that it can find.
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
        return (reg) => this.#call(reg, (defs) => callback(reg, defs));
    }

    intoPreparedSystem<D>(
        prepare: () => Promise<D>,
        callback: PreparedSystemCallback<Definition, D>,
    ): PreparedSystem<D> {
        return {
            prepare,
            run: (reg, data) => this.#call(reg, (defs) => callback(reg, defs, data)),
        };
    }

    #call(
        reg: Registry,
        fn: (defs: Generator<Definition, void, unknown>) => void | Promise<void>,
    ): void | Promise<void> {
        const defs = this.#run(reg);
        const first = defs.next();
        if (first.done) return undefined;
        return fn(this.#withFirst(reg, first.value, defs));
    }

    *#withFirst(
        reg: Registry,
        first: Definition,
        rest: Iterable<Definition>,
    ): Generator<Definition, void, unknown> {
        const ctor = first.constructor as DefinitionCtor;
        if (reg.resolve(ctor, first.identifier).includes(first) && this.#matches(first, reg)) {
            yield first;
        }
        yield* rest;
    }

    *#run(reg: Registry): Generator<Definition, void, unknown> {
        for (const def of reg.all()) {
            if (this.#matches(def, reg)) yield def;
        }
    }

    #matches(def: Definition, reg: Registry): boolean {
        return (
            this.#ctors.some((ctor) => def instanceof ctor) &&
            this.#filters.every((filter) => filter(def, reg))
        );
    }
}

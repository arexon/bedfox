import { describePlugins } from "#/plugin";
import { INVALIDATE, type Registry } from "#/registry";
import type { ScheduledSystem } from "#/schedule";

/**
 * A function that changes the registry.
 *
 * A system can be async. The run waits for it before it starts the next system. The system must
 * await all of its async work, because the registry freezes when the run ends.
 */
export type System = (reg: Registry) => void | Promise<void>;

/**
 * A system that loads its data before any system runs.
 *
 * Each run starts the `prepare` step of every prepared system at the same time. Later, at the
 * system's turn, `run` gets the loaded data. It is for slow work, such as reading files, so that
 * many systems can load at once.
 *
 * {@link prepared} creates one.
 */
export interface PreparedSystem<T> {
    /** Loads the system's data. */
    prepare(): Promise<T>;
    /** Changes the registry with the loaded data. */
    run(reg: Registry, data: T): void | Promise<void>;
}

/**
 * Creates a {@link PreparedSystem}.
 *
 * @example
 *     project.addSystem(
 *         "setup",
 *         prepared(
 *             () => readBiomes(),
 *             (reg, biomes) => {
 *                 reg.add(...biomes.map(toFeature));
 *             },
 *         ),
 *     );
 */
export function prepared<T>(
    prepare: () => Promise<T>,
    run: (reg: Registry, data: T) => void | Promise<void>,
): PreparedSystem<T> {
    return { prepare, run };
}

export const ORDER: unique symbol = Symbol("order");

export interface Order {
    readonly system: System | PreparedSystem<unknown>;
    readonly after: ReadonlySet<System | PreparedSystem<unknown>>;
    readonly before: ReadonlySet<System | PreparedSystem<unknown>>;
    readonly position: "first" | "last" | undefined;
}

/**
 * A system with rules for its order in its schedule. {@link ordered} creates one.
 *
 * Without rules, the systems of a schedule run in the order that they were added. The rules change
 * the order only inside one schedule.
 */
export class OrderedSystem {
    readonly #system: System | PreparedSystem<unknown>;
    readonly #after = new Set<System | PreparedSystem<unknown>>();
    readonly #before = new Set<System | PreparedSystem<unknown>>();
    #position?: "first" | "last";

    constructor(system: System | PreparedSystem<unknown>) {
        this.#system = system;
    }

    /**
     * Runs the system after each of `systems`.
     *
     * A system in `systems` that isn't in the same schedule has no effect, e.g. a system of a
     * plugin that the project doesn't have.
     */
    after(...systems: (System | PreparedSystem<unknown>)[]): this {
        for (const system of systems) this.#after.add(system);
        return this;
    }

    /** Runs the system before each of `systems`. See {@link OrderedSystem.after}. */
    before(...systems: (System | PreparedSystem<unknown>)[]): this {
        for (const system of systems) this.#before.add(system);
        return this;
    }

    /**
     * Runs the system after every system of its schedule that doesn't also use `afterAll()`.
     *
     * Systems that use `afterAll()` run in the order that they were added, unless `after()` or
     * `before()` changes it. This call replaces an earlier `beforeAll()`.
     */
    afterAll(): this {
        this.#position = "last";
        return this;
    }

    /**
     * Runs the system before every system of its schedule that doesn't also use `beforeAll()`.
     *
     * Systems that use `beforeAll()` run in the order that they were added, unless `after()` or
     * `before()` changes it. This call replaces an earlier `afterAll()`.
     */
    beforeAll(): this {
        this.#position = "first";
        return this;
    }

    [ORDER](): Order {
        return {
            system: this.#system,
            after: this.#after,
            before: this.#before,
            position: this.#position,
        };
    }
}

/**
 * Creates an {@link OrderedSystem}, which sets the order of `system` in its schedule.
 *
 * @example
 *     project.addSystem("finalize", ordered(writeLang).afterAll());
 *     project.addSystem(ordered(paintBlocks).after(addBlocks));
 */
export function ordered(system: System | PreparedSystem<unknown>): OrderedSystem {
    return new OrderedSystem(system);
}

export async function runSystems(
    systems: readonly ScheduledSystem[],
    reg: Registry,
): Promise<void> {
    // Wait for every step, also after a rejection, so that a new run can't start while steps of
    // this run still work.
    const settled = await Promise.allSettled(systems.map(prepare));
    const data: unknown[] = [];
    for (const result of settled) {
        if (result.status === "rejected") throw result.reason;
        data.push(result.value);
    }
    for (const [i, { system, ...location }] of systems.entries()) {
        reg[INVALIDATE]();
        try {
            const result = typeof system === "function" ? system(reg) : system.run(reg, data[i]);
            // Only wait for promises, so that sync systems run without a gap in which other async
            // work could change the registry.
            // oxlint-disable-next-line no-await-in-loop -- systems run in turn
            if (result instanceof Promise) await result;
        } catch (error) {
            throw new SystemFailedError(describeSystem(system, location), "run", error);
        }
    }
}

async function prepare({ system, ...location }: ScheduledSystem): Promise<unknown> {
    if (typeof system === "function") return undefined;
    try {
        return await system.prepare();
    } catch (error) {
        throw new SystemFailedError(describeSystem(system, location), "prepare", error);
    }
}

export function describeSystem(
    system: System | PreparedSystem<unknown>,
    { schedule, index, plugins }: Omit<ScheduledSystem, "system">,
): string {
    // An arrow function written inline as `run: (reg, data) => ...` gets the name `run`, which
    // says nothing about the system.
    const name = typeof system === "function" ? system.name : system.run.name;
    const label = name === "" || name === "run" ? "" : ` (${name})`;
    const from = plugins.length === 0 ? "" : ` from plugin ${describePlugins(plugins)}`;
    return `System ${index}${label} on ${schedule}${from}`;
}

/**
 * Thrown by {@link Project.run} when a system or a `prepare` step fails.
 *
 * The message names the system, its schedule, and the plugins that added it. The `cause` holds the
 * original error.
 */
export class SystemFailedError extends Error {
    constructor(system: string, part: "prepare" | "run", cause: unknown) {
        super(`${system} failed in ${part}`, { cause });
        this.name = "SystemFailedError";
    }
}

import type { Detail, Diagnostic } from "#/diagnostic";
import { type Plugin, pluginPath } from "#/plugin";
import { ENTER, type Registry } from "#/registry";
import type { Schedule } from "#/schedule";

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
): Promise<SystemFailed[]> {
    // Wait for every step, also after a rejection, so that a new run can't start while steps of
    // this run still work.
    const settled = await Promise.allSettled(systems.map(prepare));
    const failed = settled.flatMap((result, i) =>
        result.status === "rejected"
            ? [new SystemFailed(systems[i], "prepare", result.reason)]
            : [],
    );
    if (failed.length > 0) return failed;
    for (const [i, scheduled] of systems.entries()) {
        reg[ENTER](scheduled);
        const { system } = scheduled;
        try {
            const data = (settled[i] as PromiseFulfilledResult<unknown>).value;
            const result = typeof system === "function" ? system(reg) : system.run(reg, data);
            // Only wait for promises, so that sync systems run without a gap in which other async
            // work could change the registry.
            // oxlint-disable-next-line no-await-in-loop -- systems run in turn
            if (result instanceof Promise) await result;
        } catch (error) {
            return [new SystemFailed(scheduled, "run", error)];
        }
    }
    return [];
}

async function prepare({ system }: ScheduledSystem): Promise<unknown> {
    return typeof system === "function" ? undefined : system.prepare();
}

/** A system in its schedule. {@link Diagnostic}s use it to tell which system they are about. */
export class ScheduledSystem {
    /** The system, without the {@link ordered} wrapper. */
    readonly system: System | PreparedSystem<unknown>;
    /** The schedule that the system runs on. */
    readonly schedule: Schedule;
    /** The position of the system in the order that its schedule got the systems, from 0. */
    readonly index: number;
    /** The plugins that added the system, from the outermost. It is empty for the project's own. */
    readonly plugins: readonly Plugin[];

    constructor(
        system: System | PreparedSystem<unknown>,
        schedule: Schedule,
        index: number,
        plugins: readonly Plugin[],
    ) {
        this.system = system;
        this.schedule = schedule;
        this.index = index;
        this.plugins = plugins;
    }

    /**
     * The name of the system's function, or of the `run` function of a prepared system.
     *
     * It is `undefined` for an inline arrow function, and for a `run` function with the name `run`.
     */
    get name(): string | undefined {
        const { system } = this;
        const name = typeof system === "function" ? system.name : system.run.name;
        // An arrow function written inline as `run: (reg, data) => ...` gets the name `run`, which
        // says nothing about the system.
        return name === "" || name === "run" ? undefined : name;
    }

    /** The name and the index, e.g. `addDirt (#0)`. Without a name, it is `system #0`. */
    get label(): string {
        const { name, index } = this;
        return name === undefined ? `system #${index}` : `${name} (#${index})`;
    }
}

export const UNNAMED_HELP = "Use a named function to show the name of the system here";

/** Reported by {@link Project.run} when a system or a `prepare` step fails. */
export class SystemFailed implements Diagnostic {
    readonly severity = "error";
    readonly code = SystemFailed.name;
    readonly title: string;
    readonly details: readonly Detail[];
    readonly help?: string;
    /** The value that the system threw or rejected with. */
    readonly cause: unknown;
    /** The system that failed. */
    readonly system: ScheduledSystem;
    /** The step of the system that failed. */
    readonly part: "prepare" | "run";

    constructor(system: ScheduledSystem, part: "prepare" | "run", cause: unknown) {
        const { name, index, schedule, plugins } = system;
        this.title = `System ${name ?? `#${index}`} failed in ${part}`;
        const details: Detail[] = [
            { kind: "field", label: "schedule", value: `${schedule} (#${index})` },
        ];
        if (plugins.length > 0) {
            details.push({ kind: "field", label: "added by", value: pluginPath(plugins) });
        }
        this.details = details;
        if (name === undefined) this.help = UNNAMED_HELP;
        this.cause = cause;
        this.system = system;
        this.part = part;
    }
}

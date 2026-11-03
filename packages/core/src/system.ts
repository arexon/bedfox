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

export type Run = (reg: Registry, data: unknown) => void | Promise<void>;

export const CONFIG: unique symbol = Symbol("config");

export interface Config {
    readonly run: Run;
    readonly load: (() => unknown) | undefined;
    readonly after: ReadonlySet<Run>;
    readonly before: ReadonlySet<Run>;
    readonly position: "first" | "last" | undefined;
}

/**
 * A system with its settings, such as its order in its schedule. {@link system} creates one.
 *
 * Without order rules, the systems of a schedule run in the order that they were added. The rules
 * change the order only inside one schedule.
 */
export class SystemConfig {
    readonly #run: Run;
    readonly #load: (() => unknown) | undefined;
    readonly #after = new Set<Run>();
    readonly #before = new Set<Run>();
    #position?: "first" | "last";

    constructor(run: Run, load: (() => unknown) | undefined) {
        this.#run = run;
        this.#load = load;
    }

    /**
     * Runs the system after each of `systems`.
     *
     * A system matches if it has the same function, so `after(addBlocks)` also matches
     * `system(addBlocks)`. A system in `systems` that isn't in the same schedule has no effect,
     * e.g. a system of a plugin that the project doesn't have.
     */
    after(...systems: (System | SystemConfig)[]): this {
        for (const target of systems) this.#after.add(configOf(target).run);
        return this;
    }

    /** Runs the system before each of `systems`. See {@link SystemConfig.after}. */
    before(...systems: (System | SystemConfig)[]): this {
        for (const target of systems) this.#before.add(configOf(target).run);
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

    [CONFIG](): Config {
        return {
            run: this.#run,
            load: this.#load,
            after: this.#after,
            before: this.#before,
            position: this.#position,
        };
    }
}

const NO_RUNS: ReadonlySet<Run> = new Set();

export function configOf(system: System | SystemConfig): Config {
    return system instanceof SystemConfig
        ? system[CONFIG]()
        : { run: system, load: undefined, after: NO_RUNS, before: NO_RUNS, position: undefined };
}

/**
 * Creates a {@link SystemConfig} for `run`, e.g. to set its order in its schedule.
 *
 * @example
 *     project.addSystem("finalize", system(writeLang).afterAll());
 *     project.addSystem(system(paintBlocks).after(addBlocks));
 */
export function system(run: System): SystemConfig;
/**
 * Creates a {@link SystemConfig} for `run` that loads its data with `load` first.
 *
 * Each run calls the `load` function of every system at the same time, before any system runs.
 * Later, at the system's turn, `run` gets the loaded data. It is for slow work, such as reading
 * files, so that many systems can load at once.
 *
 * @example
 *     project.addSystem(
 *         "setup",
 *         system((reg, biomes) => {
 *             reg.add(...biomes.map(toFeature));
 *         }, readBiomes),
 *     );
 */
export function system<T>(
    run: (reg: Registry, data: T) => void | Promise<void>,
    load: () => T | Promise<T>,
): SystemConfig;
export function system(
    run: (reg: Registry, data: never) => void | Promise<void>,
    load?: () => unknown,
): SystemConfig {
    return new SystemConfig(run as Run, load);
}

export async function runSystems(
    systems: readonly ScheduledSystem[],
    reg: Registry,
): Promise<SystemFailed[]> {
    // Wait for every step, also after a rejection, so that a new run can't start while steps of
    // this run still work.
    const settled = await Promise.allSettled(
        systems.map(({ system }) => Promise.try(() => configOf(system).load?.())),
    );
    const failed = settled.flatMap((result, i) =>
        result.status === "rejected" ? [new SystemFailed(systems[i], "load", result.reason)] : [],
    );
    if (failed.length > 0) return failed;
    for (const [i, scheduled] of systems.entries()) {
        reg[ENTER](scheduled);
        try {
            const data = (settled[i] as PromiseFulfilledResult<unknown>).value;
            const result = configOf(scheduled.system).run(reg, data);
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

/** A system in its schedule. {@link Diagnostic}s use it to tell which system they are about. */
export class ScheduledSystem {
    /** The system, as {@link Project.addSystem} got it. */
    readonly system: System | SystemConfig;
    /** The schedule that the system runs on. */
    readonly schedule: Schedule;
    /** The position of the system in the order that its schedule got the systems, from 0. */
    readonly index: number;
    /** The plugins that added the system, from the outermost. It is empty for the project's own. */
    readonly plugins: readonly Plugin[];

    constructor(
        system: System | SystemConfig,
        schedule: Schedule,
        index: number,
        plugins: readonly Plugin[],
    ) {
        this.system = system;
        this.schedule = schedule;
        this.index = index;
        this.plugins = plugins;
    }

    /** The name of the system's function. It is `undefined` for an inline arrow function. */
    get name(): string | undefined {
        const { name } = configOf(this.system).run;
        return name === "" ? undefined : name;
    }

    /** The name and the index, e.g. `addDirt (#0)`. Without a name, it is `system #0`. */
    get label(): string {
        const { name, index } = this;
        return name === undefined ? `system #${index}` : `${name} (#${index})`;
    }
}

export const UNNAMED_HELP = "Use a named function to show the name of the system here";

/** Reported by {@link Project.run} when a system or its `load` function fails. */
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
    readonly part: "load" | "run";

    constructor(system: ScheduledSystem, part: "load" | "run", cause: unknown) {
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

import { INVALIDATE, type Registry } from "#/project/registry";
import { describePlugins, type ScheduledSystem } from "#/project/schedule";

/**
 * A function that changes the registry.
 *
 * A system can be async. The run waits for it before it starts the next system. Await all async
 * work in the system, because the registry closes when the run ends.
 */
export type System = (reg: Registry) => void | Promise<void>;

/**
 * A system that loads its data before any system runs.
 *
 * Each run starts the `prepare` step of every prepared system at the same time. Later, at the
 * system's turn, `run` gets the loaded data. Use it for slow work, such as reading files, so that
 * many systems can load at once.
 *
 * Create one with {@link prepared}.
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

function describeSystem(
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

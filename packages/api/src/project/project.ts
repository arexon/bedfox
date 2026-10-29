import { CLOSE, INVALIDATE, Registry, RELEASE } from "#/project/registry";
import { type Schedule, type ScheduledSystem, Schedules } from "#/project/schedule";

export interface ProjectOptions {
    /** The namespace of the project's definitions, e.g. `example` in `example:dirt`. */
    namespace: string;
}

/**
 * A function that {@link Project.run()} calls with the run's registry. It must be sync. The run
 * ignores the return value, unless it's a promise.
 */
export type System = (reg: Registry) => unknown;

/**
 * A system with an async step. Each run starts the `prepare` step of every prepared system at once,
 * before any system runs. Then, at the system's turn, it calls `run` with the value from
 * `prepare`.
 *
 * Use {@link prepared()} to create one, so that TypeScript infers `T`.
 */
export interface PreparedSystem<T> {
    /** Loads the system's data, e.g. reads files. It gets no registry, since no system ran yet. */
    prepare(): Promise<T>;
    /** Changes the registry with the data from {@link prepare}. It must be sync. */
    run(reg: Registry, data: T): unknown;
}

/**
 * Creates a prepared system.
 *
 * @example
 *     project.addSystem(
 *         "setup",
 *         prepared(
 *             () => readBiomes(),
 *             (reg, biomes) => reg.add(...biomes.map(toFeature)),
 *         ),
 *     );
 */
export function prepared<T>(
    prepare: () => Promise<T>,
    run: (reg: Registry, data: T) => unknown,
): PreparedSystem<T> {
    return { prepare, run };
}

/**
 * Holds a project's systems and runs them. Each run creates a new {@link Registry}, and every
 * system changes it in turn.
 *
 * Conventions:
 *
 * - Systems are sync. Put async work, such as a `fetch`, in a {@link prepared()} system.
 *   `addSystem()` rejects `async` functions, and `run()` rejects systems that return a promise.
 * - Systems may read files, but never write them.
 * - Create definitions inside `setup` systems. A definition created outside a system keeps the
 *   changes of earlier runs, and only one project can hold it.
 *
 * @example
 *     const project = new Project({ namespace: "example" });
 *     project.addSystem("setup", (reg) => reg.add(new Block("dirt")));
 *     // Remove features that nothing places.
 *     project.addSystem(
 *         "finalize",
 *         query(Feature)
 *             .orphan()
 *             .intoSystem((reg, features) => reg.remove(...features)),
 *     );
 *     await project.run();
 */
export class Project {
    /** The namespace of the project's definitions, e.g. `example` in `example:dirt`. */
    readonly namespace: string;

    #schedules = new Schedules();
    #registry?: Registry;
    #running = false;

    constructor(options: ProjectOptions) {
        this.namespace = options.namespace;
    }

    /**
     * Adds systems to run on `schedule`.
     *
     * @example
     *     project.addSystem("setup", (reg) => reg.add(new Block("dirt")));
     *
     * @throws - {@link SystemAddedDuringRunError} if the project is running.
     * @throws - {@link AsyncSystemError} if a system, or the `run` part of a prepared system, is an
     *   `async` function. It adds none of the systems then.
     */
    addSystem(schedule: Schedule, ...systems: (System | PreparedSystem<unknown>)[]): this;
    /**
     * Adds systems to run on the `transform` schedule.
     *
     * @example
     *     project.addSystem((reg) => {
     *         for (const dirt of reg.resolve(Block, "dirt")) {
     *             dirt.setComponent(new FrictionBlockComponent(0.4));
     *         }
     *     });
     *
     * @throws - {@link SystemAddedDuringRunError} if the project is running.
     * @throws - {@link AsyncSystemError} if a system, or the `run` part of a prepared system, is an
     *   `async` function. It adds none of the systems then.
     */
    addSystem(...systems: (System | PreparedSystem<unknown>)[]): this;
    addSystem(
        first?: Schedule | System | PreparedSystem<unknown>,
        ...rest: (System | PreparedSystem<unknown>)[]
    ): this {
        if (this.#running) throw new SystemAddedDuringRunError();
        const [schedule, systems] =
            typeof first === "string"
                ? [first, rest]
                : [this.#schedules.default, first === undefined ? [] : [first, ...rest]];
        const offset = this.#schedules.size(schedule);
        for (const [i, system] of systems.entries()) {
            // oxlint-disable-next-line typescript/unbound-method -- only inspected, never called
            const fn = typeof system === "function" ? system : system.run;
            // This catches only `async` functions. `run()` catches other functions that return a
            // promise.
            if (fn.constructor.name === "AsyncFunction") {
                const location = { schedule, index: offset + i };
                throw new AsyncSystemError(`${describeSystem(system, location)} is async`);
            }
        }
        this.#schedules.add(schedule, systems);
        return this;
    }

    /**
     * Runs every system on a new registry, schedule by schedule, in the order that `addSystem()`
     * added them. First it waits for the `prepare` step of every prepared system. If one rejects,
     * no system runs, and the run rejects when every `prepare` step has ended. The registry closes
     * when the run ends, also when the run fails.
     *
     * A new run releases the definitions of the last run, so that systems can add them again.
     *
     * @throws - {@link RunInProgressError} if the project is already running.
     * @throws - {@link SystemFailedError} if a system throws or a `prepare` step rejects. If more
     *   than one `prepare` step rejects, the first in system order.
     * @throws - {@link AsyncSystemError} if a system returns a promise.
     */
    async run(): Promise<void> {
        if (this.#running) throw new RunInProgressError();
        this.#running = true;
        try {
            const systems = this.#schedules.list();
            this.#registry?.[RELEASE]();
            const reg = new Registry(this.namespace);
            this.#registry = reg;
            try {
                // Wait for every step, also after a rejection, so that a new run can't start
                // while steps of this run still work.
                const settled = await Promise.allSettled(systems.map(prepare));
                const data: unknown[] = [];
                for (const result of settled) {
                    if (result.status === "rejected") throw result.reason;
                    data.push(result.value);
                }
                for (const [i, scheduled] of systems.entries()) {
                    reg[INVALIDATE]();
                    runSync(scheduled, reg, data[i]);
                }
            } finally {
                reg[CLOSE]();
            }
        } finally {
            this.#running = false;
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

function runSync({ system, ...location }: ScheduledSystem, reg: Registry, data: unknown): void {
    let result: unknown;
    try {
        result = typeof system === "function" ? system(reg) : system.run(reg, data);
    } catch (error) {
        throw new SystemFailedError(describeSystem(system, location), "run", error);
    }
    // Only native promises count. Thenables and promises from another realm pass.
    if (result instanceof Promise) {
        // A promise that rejects later would crash Node as an unhandled rejection. Ignore its
        // result: the AsyncSystemError already tells the user to fix the system, but this also
        // hides any error from the async work itself.
        result.catch(() => {});
        throw new AsyncSystemError(`${describeSystem(system, location)} returned a promise`);
    }
}

/** Names a system for error messages, e.g. `System 0 (addDirt) on setup`. */
function describeSystem(
    system: System | PreparedSystem<unknown>,
    { schedule, index }: Omit<ScheduledSystem, "system">,
): string {
    // An arrow function written inline as `run: (reg, data) => ...` gets the name `run`, which
    // says nothing about the system.
    const name = typeof system === "function" ? system.name : system.run.name;
    const label = name === "" || name === "run" ? "" : ` (${name})`;
    return `System ${index}${label} on ${schedule}`;
}

/** An error caused by a system that threw, or by a `prepare` step that rejected. */
export class SystemFailedError extends Error {
    constructor(system: string, part: "prepare" | "run", cause: unknown) {
        super(`${system} failed in ${part}`, { cause });
        this.name = "SystemFailedError";
    }
}

/** An error caused by an `async` system, or by a system that returned a promise. */
export class AsyncSystemError extends TypeError {
    /** @param problem - What is async, e.g. `System 0 on setup is async`. */
    constructor(problem: string) {
        super(
            `${problem}. Systems must be sync, so move async work into the prepare step of a prepared system`,
        );
        this.name = "AsyncSystemError";
    }
}

/** An error caused by starting a run while another run of the same project is active. */
export class RunInProgressError extends Error {
    constructor() {
        super("Can't start a run while another run of this project is active");
        this.name = "RunInProgressError";
    }
}

/** An error caused by adding a system while the project runs. */
export class SystemAddedDuringRunError extends Error {
    constructor() {
        super("Can't add systems while the project runs. Add them before run()");
        this.name = "SystemAddedDuringRunError";
    }
}

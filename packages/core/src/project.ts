import { loadPlugins, type Plugin, SystemAddedDuringRunError } from "#/plugin";
import { FREEZE, FrozenRegistry, Registry } from "#/registry";
import { type Schedule, Schedules } from "#/schedule";
import { type PreparedSystem, runSystems, type System } from "#/system";

interface PluginCall {
    readonly schedules: Schedules;
    readonly plugins: Plugin[];
    readonly path: readonly string[];
}

/**
 * The systems and plugins that make an Add-On.
 *
 * Each run uses a new {@link Registry} and starts again from nothing, so a project can run again
 * after its source files change. {@link Project.run} returns the {@link FrozenRegistry} of the run,
 * which generates the pack files.
 *
 * Systems run on three schedules: `setup`, then `transform`, then `finalize`. A definition created
 * outside a system keeps the changes of earlier runs.
 *
 * Systems and plugins can be async. The run waits for each one before it starts the next.
 * {@link prepared} systems load data for many systems at the same time. Systems can read files, but
 * they must not write them.
 *
 * @example
 *     const project = new Project("example");
 *     project.addSystem("setup", (reg) => {
 *         reg.add(new Block("dirt"));
 *     });
 *     // Remove features that nothing places.
 *     project.addSystem(
 *         "finalize",
 *         query(Feature)
 *             .orphan()
 *             .intoSystem((reg, features) => reg.remove(...features)),
 *     );
 *     const reg = await project.run();
 *     const files = reg.emit();
 */
export class Project {
    /** The namespace of the project's definitions, e.g. `example` in `example:dirt`. */
    readonly namespace: string;

    #systems = new Schedules();
    #plugins: Plugin[] = [];
    #state: "idle" | "running" | PluginCall = "idle";

    /** Creates a project for `namespace`, e.g. `example` in `example:dirt`. */
    constructor(namespace: string) {
        this.namespace = namespace;
    }

    /**
     * Adds systems to `schedule`.
     *
     * The systems of one schedule run in the order that `addSystem()` gets them. The project's own
     * systems run before the systems of its plugins.
     *
     * @example
     *     project.addSystem("setup", (reg) => {
     *         reg.add(new Block("dirt"));
     *     });
     *
     * @throws - {@link SystemAddedDuringRunError} if the project runs, outside a plugin's
     *   `build()`.
     */
    addSystem(schedule: Schedule, ...systems: (System | PreparedSystem<unknown>)[]): this;
    /**
     * Adds systems to the `transform` schedule.
     *
     * @example
     *     project.addSystem((reg) => {
     *         for (const dirt of reg.resolve(Block, "dirt")) {
     *             dirt.setComponent(new FrictionBlockComponent(0.4));
     *         }
     *     });
     *
     * @throws - {@link SystemAddedDuringRunError} if the project runs, outside a plugin's
     *   `build()`.
     */
    addSystem(...systems: (System | PreparedSystem<unknown>)[]): this;
    addSystem(
        first?: Schedule | System | PreparedSystem<unknown>,
        ...rest: (System | PreparedSystem<unknown>)[]
    ): this {
        const [schedule, systems] =
            typeof first === "string"
                ? [first, rest]
                : [Schedules.default, first === undefined ? [] : [first, ...rest]];
        const state = this.#state;
        if (state === "running") throw new SystemAddedDuringRunError();
        if (state === "idle") this.#systems.add(schedule, systems, []);
        else state.schedules.add(schedule, systems, state.path);
        return this;
    }

    /**
     * Adds plugins.
     *
     * Each run calls the plugins in the order that `addPlugin()` gets them. A plugin's own systems
     * run before the systems of the plugins that it adds.
     *
     * A project holds one plugin of each class. A second plugin of the same class makes the run
     * fail, also if another plugin adds it.
     *
     * @example
     *     project.addPlugin(new FishPlugin());
     *
     * @throws - {@link SystemAddedDuringRunError} if the project runs, outside a plugin's
     *   `build()`.
     */
    addPlugin(...plugins: Plugin[]): this {
        const state = this.#state;
        if (state === "running") throw new SystemAddedDuringRunError();
        if (state === "idle") this.#plugins.push(...plugins);
        else state.plugins.push(...plugins);
        return this;
    }

    /**
     * Runs every plugin and system once, on a new registry.
     *
     * First, the run calls the plugins. Then it waits for the `prepare` step of every prepared
     * system. Then it runs the systems, schedule by schedule. If a plugin or a `prepare` step
     * fails, no system runs.
     *
     * When the run ends, its registry freezes, also when the run fails. If the run ends without an
     * error, it returns the registry as a {@link FrozenRegistry}.
     *
     * @throws - {@link RunInProgressError} if the project already runs.
     * @throws - {@link PluginFailedError} if a plugin fails.
     * @throws - {@link DuplicatePluginError} if two plugins have the same class.
     * @throws - {@link SystemFailedError} if a system or a `prepare` step fails.
     */
    async run(): Promise<FrozenRegistry> {
        if (this.#state !== "idle") throw new RunInProgressError();
        this.#state = "running";
        try {
            const schedules = this.#systems.copy();
            await loadPlugins(this.#plugins, async (plugin, path) => {
                const call: PluginCall = { schedules, plugins: [], path };
                this.#state = call;
                try {
                    const result = plugin.build(this);
                    if (result instanceof Promise) await result;
                } finally {
                    this.#state = "running";
                }
                return call.plugins;
            });
            const reg = new Registry(this.namespace);
            try {
                await runSystems(schedules.list(), reg);
            } finally {
                reg[FREEZE]();
            }
            return new FrozenRegistry(reg);
        } finally {
            this.#state = "idle";
        }
    }
}

/** Thrown by {@link Project.run} while the project already runs. */
export class RunInProgressError extends Error {
    constructor() {
        super("Can't start a run while another run of this project is active");
        this.name = "RunInProgressError";
    }
}

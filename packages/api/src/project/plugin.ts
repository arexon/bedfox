import type { Project } from "#/project/project";
import { describePlugins } from "#/project/schedule";

/**
 * A reusable group of systems and other plugins.
 *
 * Each run of a {@link Project} calls `build()` again. Error messages name a system by its function
 * name. An inline arrow function has no name.
 *
 * A project holds one plugin of each class. A plugin gets its options from the arguments of its
 * constructor.
 *
 * @example
 *     class DirtPlugin implements Plugin {
 *         build(project: Project): void {
 *             project.addSystem("setup", DirtPlugin.addDirt);
 *         }
 *
 *         static addDirt(reg: Registry): void {
 *             reg.add(new Block("dirt"));
 *         }
 *     }
 *
 *     project.addPlugin(new DirtPlugin());
 */
export interface Plugin {
    /**
     * Adds the plugin's systems and plugins to `project`.
     *
     * It can be async. Every call on `project` must happen before `build()` ends.
     */
    build(project: Project): void | Promise<void>;
}

export async function loadPlugins(
    plugins: readonly Plugin[],
    call: (plugin: Plugin, path: readonly string[]) => Promise<readonly Plugin[]>,
): Promise<void> {
    const called = new Map<unknown, readonly string[]>();
    const pending = plugins.map((plugin) => ({ plugin, addedBy: [] as readonly string[] }));
    for (let next = pending.shift(); next !== undefined; next = pending.shift()) {
        const { plugin, addedBy } = next;
        const ctor: unknown = plugin.constructor;
        const name = (ctor as { name: string }).name || "(anonymous)";
        const first = called.get(ctor);
        if (first !== undefined) throw new DuplicatePluginError(name, first);
        // Mark the plugin before the call, so that a plugin that adds itself throws instead of
        // calling itself without end.
        called.set(ctor, addedBy);
        const path = [...addedBy, name];
        let added: readonly Plugin[];
        try {
            // oxlint-disable-next-line no-await-in-loop -- plugins run in turn
            added = await call(plugin, path);
        } catch (error) {
            throw new PluginFailedError(describePlugins(path), error);
        }
        pending.unshift(...added.map((plugin) => ({ plugin, addedBy: path })));
    }
}

/**
 * Thrown by {@link Project.run} when a plugin's `build()` fails.
 *
 * The message names the plugin and the plugins that added it. The `cause` holds the original error.
 */
export class PluginFailedError extends Error {
    constructor(plugin: string, cause: unknown) {
        super(`Plugin ${plugin} failed`, { cause });
        this.name = "PluginFailedError";
    }
}

/** Thrown by {@link Project.run} when a project has two plugins of the same class. */
export class DuplicatePluginError extends TypeError {
    constructor(name: string, addedBy: readonly string[]) {
        const by = addedBy.length === 0 ? "" : ` by ${describePlugins(addedBy)}`;
        super(`Plugin ${name} is already added${by}`);
        this.name = "DuplicatePluginError";
    }
}

/**
 * Thrown by {@link Project.addSystem} and {@link Project.addPlugin} when the project runs, outside a
 * plugin's `build()`.
 */
export class SystemAddedDuringRunError extends Error {
    constructor() {
        super(
            "Can't add systems or plugins while the project runs. Add them before run(), or in a plugin's build() before it ends",
        );
        this.name = "SystemAddedDuringRunError";
    }
}

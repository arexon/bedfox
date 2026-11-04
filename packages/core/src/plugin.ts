import type { Detail, Diagnostic } from "#/diagnostic";
import type { Project } from "#/project";

/**
 * A reusable group of systems and other plugins.
 *
 * Each run of a {@link Project} calls `build()` again. Diagnostics name a system by its function
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
    call: (plugin: Plugin, path: readonly Plugin[]) => Promise<readonly Plugin[]>,
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    const called = new Map<unknown, readonly Plugin[]>();
    const pending = plugins.map((plugin) => ({ plugin, addedBy: [] as readonly Plugin[] }));
    for (let next = pending.shift(); next !== undefined; next = pending.shift()) {
        const { plugin, addedBy } = next;
        const path = [...addedBy, plugin];
        const first = called.get(plugin.constructor);
        if (first !== undefined) {
            diagnostics.push(new DuplicatePlugin(first, path));
            continue;
        }
        // Mark the plugin before the call, so that a plugin that adds its own class is a
        // duplicate instead of a call without end.
        called.set(plugin.constructor, path);
        let added: readonly Plugin[];
        try {
            // oxlint-disable-next-line no-await-in-loop -- plugins run in turn
            added = await call(plugin, path);
        } catch (error) {
            diagnostics.push(new PluginFailed(path, error));
            return diagnostics;
        }
        pending.unshift(...added.map((plugin) => ({ plugin, addedBy: path })));
    }
    return diagnostics;
}

export function pluginPath(plugins: readonly Plugin[]): string {
    return plugins.map((plugin) => plugin.constructor.name || "(anonymous)").join(" > ");
}

function addedBy(path: readonly Plugin[]): string {
    return path.length === 1 ? "the project" : pluginPath(path.slice(0, -1));
}

/** Reported by {@link Project.run} when a plugin's `build()` fails. */
export class PluginFailed implements Diagnostic {
    readonly severity = "error";
    readonly code = PluginFailed.name;
    readonly title: string;
    readonly details: readonly Detail[];
    /** The value that `build()` threw or rejected with. */
    readonly cause: unknown;
    /** The plugin that failed, after the plugins that added it, from the outermost. */
    readonly plugins: readonly Plugin[];

    constructor(plugins: readonly Plugin[], cause: unknown) {
        this.title = `Plugin ${pluginPath(plugins.slice(-1))} failed in build()`;
        this.details = [{ kind: "field", label: "added by", value: addedBy(plugins) }];
        this.cause = cause;
        this.plugins = plugins;
    }
}

/**
 * Reported by {@link Project.run} when a project has two plugins of the same class.
 *
 * The run skips the second plugin, and calls the plugins after it.
 */
export class DuplicatePlugin implements Diagnostic {
    readonly severity = "error";
    readonly code = DuplicatePlugin.name;
    readonly title: string;
    readonly details: readonly Detail[];
    readonly help = "A project holds one plugin of each class";
    /** The first plugin of the class, after the plugins that added it, from the outermost. */
    readonly first: readonly Plugin[];
    /** The second plugin of the class, after the plugins that added it, from the outermost. */
    readonly again: readonly Plugin[];

    constructor(first: readonly Plugin[], again: readonly Plugin[]) {
        this.title = `Plugin ${pluginPath(again.slice(-1))} is added twice`;
        this.details = [
            { kind: "field", label: "first added by", value: addedBy(first) },
            { kind: "field", label: "again added by", value: addedBy(again) },
        ];
        this.first = first;
        this.again = again;
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

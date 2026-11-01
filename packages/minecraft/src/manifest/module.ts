/** The type of a manifest module. */
export type ModuleType = "data" | "resources" | "script";

/** A SemVer version in a manifest, e.g. `1.2.0` or `1.0.0-beta.1`. */
export type Version =
    | `${number}.${number}.${number}`
    | `${number}.${number}.${number}-${string}`
    | `${number}.${number}.${number}+${string}`
    | "beta";

/** The version of a built-in script module, e.g. `2.1.0` or `beta`. */
export type ModuleVersion = Version | `${number}` | "alpha" | "beta" | "internal";

/**
 * The JSON of a module in the `modules` list of a manifest.
 *
 * A field is `undefined` if the module doesn't set it. The manifest then sets `uuid` and `version`.
 */
export interface ModuleJson {
    type: ModuleType;
    uuid: string | undefined;
    version: string | undefined;
    description: string | undefined;
    language?: "javascript";
    entry?: string;
}

/** The JSON of a built-in script module in the `dependencies` list of a manifest. */
export interface ModuleDependencyJson {
    module_name: string;
    version: ModuleVersion;
    optional?: true;
}

/**
 * A module of a pack, for `Manifest.module()`.
 *
 * The manifest derives the module's UUID from the header UUID. The module uses the manifest's
 * version. {@link uuid} and {@link version} set other values.
 */
export abstract class ManifestModule {
    /** The module's type. */
    abstract readonly type: ModuleType;

    #description?: string;
    #uuid?: string;
    #version?: Version;

    /** Sets a description of the module's content. */
    description(description: string): this {
        this.#description = description;
        return this;
    }

    /** Sets the module's UUID, instead of the UUID that the manifest derives. */
    uuid(uuid: string): this {
        this.#uuid = uuid;
        return this;
    }

    /** Sets the module's version, instead of the manifest's version. */
    version(version: Version): this {
        this.#version = version;
        return this;
    }

    toJSON(): ModuleJson {
        return {
            type: this.type,
            uuid: this.#uuid,
            version: this.#version,
            description: this.#description,
        };
    }
}

/** A module that makes a pack a behavior pack. */
export class DataModule extends ManifestModule {
    readonly type = "data";
}

/** A module that makes a pack a resource pack. */
export class ResourcesModule extends ManifestModule {
    readonly type = "resources";
}

/**
 * A module that runs a JavaScript file in a behavior pack.
 *
 * The manifest derives the module's UUID from the header UUID and {@link entry}.
 *
 * @example
 *     new ScriptModule("scripts/main.js")
 *         .dependsOn("@minecraft/server", "2.1.0")
 *         .optionallyDependsOn("@minecraft/server-ui", "2.0.0");
 */
export class ScriptModule extends ManifestModule {
    readonly type = "script";

    /** The path of the JavaScript file from the pack's root, e.g. `scripts/main.js`. */
    readonly entry: string;

    #dependencies: ModuleDependencyJson[] = [];

    /** Creates a module that runs the JavaScript file at `entry`. */
    constructor(entry: string) {
        super();
        this.entry = entry;
    }

    /**
     * Adds a built-in script module as a dependency, e.g. `@minecraft/server`.
     *
     * If `moduleName` is already a dependency, this call replaces it.
     */
    dependsOn(moduleName: string, version: ModuleVersion): this {
        return this.#depend({ module_name: moduleName, version });
    }

    /**
     * Adds a built-in script module as an optional dependency.
     *
     * The pack still loads if the module isn't available. If `moduleName` is already a dependency,
     * this call replaces it.
     */
    optionallyDependsOn(moduleName: string, version: ModuleVersion): this {
        return this.#depend({ module_name: moduleName, version, optional: true });
    }

    /** The built-in script modules that this module depends on. */
    get dependencies(): readonly ModuleDependencyJson[] {
        return this.#dependencies;
    }

    override toJSON(): ModuleJson {
        return { ...super.toJSON(), language: "javascript", entry: this.entry };
    }

    #depend(dependency: ModuleDependencyJson): this {
        const index = this.#dependencies.findIndex(
            (dep) => dep.module_name === dependency.module_name,
        );
        if (index === -1) this.#dependencies.push(dependency);
        else this.#dependencies[index] = dependency;
        return this;
    }
}

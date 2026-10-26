export type ModuleType = "data" | "resources" | "script";

/** A SemVer version as manifests write it, e.g. `1.2.0` or `1.0.0-beta.1`. */
export type Version =
    | `${number}.${number}.${number}`
    | `${number}.${number}.${number}-${string}`
    | `${number}.${number}.${number}+${string}`
    | "beta";

/** A built-in script module version. */
export type ModuleVersion = Version | `${number}` | "alpha" | "beta" | "internal";

/**
 * A module as a manifest writes it in `modules`. A manifest fills in the UUID and version a module
 * leaves unset.
 */
export interface ModuleJson {
    type: ModuleType;
    uuid: string | undefined;
    version: string | undefined;
    description: string | undefined;
    language?: "javascript";
    entry?: string;
}

/** A built-in script module dependency as a manifest writes it in `dependencies`. */
export interface ModuleDependencyJson {
    module_name: string;
    version: ModuleVersion;
    optional?: true;
}

/**
 * Something a pack contains, added to a manifest with `module()`. Its UUID is derived from the
 * manifest's header UUID and its version is the manifest's, unless set.
 */
export abstract class ManifestModule {
    abstract readonly type: ModuleType;

    #description?: string;
    #uuid?: string;
    #version?: Version;

    /** Sets a description of what the module holds. */
    description(description: string): this {
        this.#description = description;
        return this;
    }

    /** Sets the module's UUID, instead of the one derived from the manifest's header UUID. */
    uuid(uuid: string): this {
        this.#uuid = uuid;
        return this;
    }

    /** Sets the module's version, instead of the manifest's. */
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

/** The module that makes a pack a behavior pack. */
export class DataModule extends ManifestModule {
    readonly type = "data";
}

/** The module that makes a pack a resource pack. */
export class ResourcesModule extends ManifestModule {
    readonly type = "resources";
}

/**
 * A JavaScript module that runs `entry`, a path inside a behavior pack. Its UUID is derived from
 * the manifest's header UUID and `entry`, unless set.
 *
 * @example
 *     new ScriptModule("scripts/main.js").dependsOn("@minecraft/server", "2.1.0");
 */
export class ScriptModule extends ManifestModule {
    readonly type = "script";

    readonly entry: string;

    #dependencies: ModuleDependencyJson[] = [];

    constructor(entry: string) {
        super();
        this.entry = entry;
    }

    /**
     * Depends on a built-in script module, e.g. `@minecraft/server`. Depending on the same module
     * again replaces its version.
     */
    dependsOn(moduleName: string, version: ModuleVersion): this {
        return this.#depend({ module_name: moduleName, version });
    }

    /** Like {@link dependsOn}, but the pack still loads if the module isn't available. */
    optionallyDependsOn(moduleName: string, version: ModuleVersion): this {
        return this.#depend({ module_name: moduleName, version, optional: true });
    }

    /** The built-in script modules this depends on, which a manifest writes in `dependencies`. */
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

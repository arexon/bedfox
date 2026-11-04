import { type Emitted, type PackKind, Resource } from "@bedfox/core";

import {
    DataModule,
    type ManifestModule,
    type ModuleDependencyJson,
    ResourcesModule,
    ScriptModule,
    type Version,
} from "#/manifest/module";
import type { Setting } from "#/manifest/settings";
import { deriveUuid } from "#/manifest/uuid";

export * from "#/manifest/module";
export * from "#/manifest/settings";

/** An optional engine feature that a pack can enable. */
export type PackCapability = "chemistry" | "editorExtension" | "script_eval" | "raytraced" | "pbr";

/** Where players can apply a pack. */
export type PackScope = "global" | "world" | "system" | "any";

interface SubpackJson {
    name: string;
    folder_name: string;
    memory_performance_tier: number;
}

/**
 * The `manifest.json` file of a pack, in format version 3.
 *
 * The modules set the kind of pack. A {@link ResourcesModule} makes a resource pack. A
 * {@link DataModule} or a {@link ScriptModule} makes a behavior pack. {@link BehaviorManifest} and
 * {@link ResourceManifest} start with the module of their kind.
 *
 * A manifest needs a name, a header UUID and a min engine version before it emits.
 * {@link ManifestPlugin} sets them, among other defaults.
 *
 * @example
 *     project.addSystem("setup", (reg) => {
 *         reg.resource(BehaviorManifest)
 *             .addAuthor("Steve")
 *             .addModule(
 *                 new ScriptModule("scripts/main.js").addDependency("@minecraft/server", "2.1.0"),
 *             );
 *     });
 */
export class Manifest extends Resource {
    #name?: string;
    #description?: string;
    #version: Version = "1.0.0";
    #minEngineVersion?: Version;
    #scope?: PackScope;
    #uuid?: string;
    #modules: ManifestModule[] = [];
    #dependencies: Manifest[] = [];
    #capabilities: PackCapability[] = [];
    #authors: string[] = [];
    #url?: string;
    #license?: string;
    #productType?: "addon";
    #generatedWith: Record<string, string[]> = {};
    #settings: Setting[] = [];
    #subpacks: SubpackJson[] = [];

    /**
     * The kind of pack that the modules make.
     *
     * @throws - {@link InvalidModulesError} if the manifest has no modules, or has a resources
     *   module together with a data or script module.
     */
    get kind(): PackKind {
        const resources = this.#modules.some((module) => module.type === "resources");
        const behavior = this.#modules.some((module) => module.type !== "resources");
        if (resources && behavior) {
            throw new InvalidModulesError(
                "a resources module can't be in a pack with data or scripts",
            );
        }
        if (!resources && !behavior) throw new InvalidModulesError("a manifest needs a module");
        return resources ? "resource" : "behavior";
    }

    /** The path of the file from the pack's root: `manifest.json`. */
    get path(): string {
        return "manifest.json";
    }

    /** Sets the name that the game shows in the pack list. */
    setName(name: string): this {
        this.#name = name;
        return this;
    }

    /** Sets the description that the game shows under the name. */
    setDescription(description: string): this {
        this.#description = description;
        return this;
    }

    /**
     * Sets the pack's version. The modules use this version, unless they set their own.
     *
     * @default "1.0.0"
     */
    setVersion(version: Version): this {
        this.#version = version;
        return this;
    }

    /** Sets the oldest game version that the pack supports, e.g. `1.26.50`. */
    setMinEngineVersion(version: Version): this {
        this.#minEngineVersion = version;
        return this;
    }

    /** Sets where players can apply the pack, e.g. `world` to apply it only to worlds. */
    setScope(scope: PackScope): this {
        this.#scope = scope;
        return this;
    }

    /** Sets the header UUID. The UUIDs of the modules derive from it, unless they set their own. */
    setUuid(uuid: string): this {
        this.#uuid = uuid;
        return this;
    }

    /** Adds modules, in order. The manifest skips a module that it already has. */
    addModule(...modules: ManifestModule[]): this {
        for (const module of modules) {
            if (!this.#modules.includes(module)) this.#modules.push(module);
        }
        return this;
    }

    /** Removes modules. The manifest skips a module that it doesn't have. */
    removeModule(...modules: ManifestModule[]): this {
        this.#modules = this.#modules.filter((module) => !modules.includes(module));
        return this;
    }

    /**
     * Adds another pack as a dependency.
     *
     * The dependency uses the header UUID and the version that `pack` has when this manifest emits.
     * The manifest skips a pack that is already a dependency.
     */
    addDependency(pack: Manifest): this {
        if (!this.#dependencies.includes(pack)) this.#dependencies.push(pack);
        return this;
    }

    /** Removes another pack as a dependency. The manifest skips a pack that isn't a dependency. */
    removeDependency(pack: Manifest): this {
        this.#dependencies = this.#dependencies.filter((dependency) => dependency !== pack);
        return this;
    }

    /** Enables optional engine features, e.g. `pbr`. The manifest skips a feature that is on. */
    addCapability(...names: PackCapability[]): this {
        for (const name of names) {
            if (!this.#capabilities.includes(name)) this.#capabilities.push(name);
        }
        return this;
    }

    /** Adds authors of the pack. */
    addAuthor(...names: string[]): this {
        this.#authors.push(...names);
        return this;
    }

    /** Sets the pack's license, e.g. `MIT`. */
    setLicense(license: string): this {
        this.#license = license;
        return this;
    }

    /** Sets the URL of the pack's home page. */
    setUrl(url: string): this {
        this.#url = url;
        return this;
    }

    /**
     * Sets the pack's product type.
     *
     * The game accepts only `addon`, for packs that players add to worlds. The value doesn't change
     * how the pack works.
     */
    setProductType(productType: "addon"): this {
        this.#productType = productType;
        return this;
    }

    /**
     * Records the versions of a tool that helped to generate the manifest.
     *
     * A second call for the same tool replaces its versions.
     *
     * @example
     *     manifest.setGeneratedWith("mctools", "0.12.0");
     */
    setGeneratedWith(tool: string, ...versions: string[]): this {
        this.#generatedWith[tool] = versions;
        return this;
    }

    /**
     * Adds settings that players can change in the pack's settings screen.
     *
     * The screen shows the settings in the order that this method gets them. The manifest skips a
     * setting that it already has. A manifest can have up to 50 settings.
     *
     * @example
     *     manifest.addSetting(
     *         new LabelSetting("Tune the explosions"),
     *         new ToggleSetting("example:explosions", "Explosions").setDefault(true),
     *         new SliderSetting("example:power", "Power", 1, 4).setDefault(3),
     *     );
     */
    addSetting(...settings: Setting[]): this {
        for (const setting of settings) {
            if (!this.#settings.includes(setting)) this.#settings.push(setting);
        }
        return this;
    }

    /** Removes settings. The manifest skips a setting that it doesn't have. */
    removeSetting(...settings: Setting[]): this {
        this.#settings = this.#settings.filter((setting) => !settings.includes(setting));
        return this;
    }

    /**
     * Adds a subpack: a folder in `subpacks/` that players can select.
     *
     * `memoryPerformanceTier` is the memory tier of the subpack, from 0 to 5.
     */
    addSubpack(folderName: string, name: string, memoryPerformanceTier: number): this {
        this.#subpacks.push({
            name,
            folder_name: folderName,
            memory_performance_tier: memoryPerformanceTier,
        });
        return this;
    }

    /**
     * Generates the JSON of the manifest.
     *
     * @throws - {@link InvalidModulesError} if the modules don't make a behavior or resource pack.
     * @throws - {@link IncompleteManifestError} if the manifest has no name, header UUID or min
     *   engine version, or a dependency has no header UUID.
     * @throws - {@link DuplicateModuleUuidError} if two modules have the same UUID.
     */
    emit(): Emitted {
        const kind = this.kind;
        const name = this.#name;
        const uuid = this.#uuid;
        const minEngineVersion = this.#minEngineVersion;
        if (name === undefined || uuid === undefined || minEngineVersion === undefined) {
            const missing = Object.entries({
                setName: name,
                setUuid: uuid,
                setMinEngineVersion: minEngineVersion,
            })
                .filter(([, value]) => value === undefined)
                .map(([setter]) => setter);
            throw new IncompleteManifestError(`The ${kind} pack manifest`, missing);
        }

        const header = {
            name,
            description: this.#description,
            uuid,
            version: this.#version,
            min_engine_version: minEngineVersion,
            pack_scope: this.#scope,
        };
        const modules = this.#modules.map((module) => {
            const entry = module.toJSON();
            const name = entry.entry === undefined ? entry.type : `${entry.type}/${entry.entry}`;
            entry.uuid ??= deriveUuid(`${header.uuid}/${name}`);
            entry.version ??= header.version;
            return entry;
        });
        const uuids = new Set<string>();
        for (const { uuid } of modules) {
            if (uuid === undefined) continue;
            if (uuids.has(uuid)) throw new DuplicateModuleUuidError(uuid);
            uuids.add(uuid);
        }

        const moduleDependencies = new Map<string, ModuleDependencyJson>();
        for (const module of this.#modules) {
            if (!(module instanceof ScriptModule)) continue;
            for (const dep of module.dependencies) moduleDependencies.set(dep.module_name, dep);
        }
        const dependencies = [
            ...this.#dependencies.map((pack) => {
                if (pack.#uuid === undefined) {
                    const dependency = pack.#name ?? pack.constructor.name;
                    throw new IncompleteManifestError(`The dependency ${dependency}`, ["setUuid"]);
                }
                return { uuid: pack.#uuid, version: pack.#version };
            }),
            ...moduleDependencies.values(),
        ];

        const metadata = {
            authors: this.#authors.length > 0 ? this.#authors : undefined,
            url: this.#url,
            license: this.#license,
            product_type: this.#productType,
            generated_with:
                Object.keys(this.#generatedWith).length > 0 ? this.#generatedWith : undefined,
        };

        // TODO: Return plain JSON. The settings are class instances with `toJSON()`, so code that
        // reads this value without `JSON.stringify()` gets the instances.
        return {
            format: "json",
            value: {
                format_version: 3,
                header,
                modules,
                dependencies: dependencies.length > 0 ? dependencies : undefined,
                settings: this.#settings.length > 0 ? this.#settings : undefined,
                subpacks: this.#subpacks.length > 0 ? this.#subpacks : undefined,
                capabilities: this.#capabilities.length > 0 ? this.#capabilities : undefined,
                metadata: Object.values(metadata).some((value) => value !== undefined)
                    ? metadata
                    : undefined,
            },
        };
    }
}

/** The manifest of the behavior pack. It starts with a {@link DataModule}. */
export class BehaviorManifest extends Manifest {
    constructor() {
        super();
        this.addModule(new DataModule());
    }
}

/** The manifest of the resource pack. It starts with a {@link ResourcesModule}. */
export class ResourceManifest extends Manifest {
    constructor() {
        super();
        this.addModule(new ResourcesModule());
    }
}

/**
 * Thrown by {@link Manifest.kind} and {@link Manifest.emit} when the modules don't make a behavior or
 * resource pack.
 */
export class InvalidModulesError extends TypeError {
    constructor(reason: string, options?: ErrorOptions) {
        super(`Invalid manifest modules: ${reason}`, options);
        this.name = "InvalidModulesError";
    }
}

/**
 * Thrown by {@link Manifest.emit} when the manifest or a dependency has no value for a required
 * field.
 */
export class IncompleteManifestError extends TypeError {
    constructor(subject: string, setters: readonly string[]) {
        const calls = setters.map((setter) => `${setter}()`).join(", ");
        const them = setters.length === 1 ? "it" : "them";
        super(`${subject} needs ${calls}. Call ${them}, or add ManifestPlugin`);
        this.name = "IncompleteManifestError";
    }
}

/** Thrown by {@link Manifest.emit} when two modules have the same UUID. */
export class DuplicateModuleUuidError extends TypeError {
    constructor(uuid: string) {
        super(`Found more than one module with UUID ${uuid}`);
        this.name = "DuplicateModuleUuidError";
    }
}

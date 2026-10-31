import type { PackKind, PackOutput } from "#/core/output";
import {
    type ManifestModule,
    type ModuleDependencyJson,
    ScriptModule,
    type Version,
} from "#/manifest/module";
import type { Setting } from "#/manifest/settings";
import { deriveUuid } from "#/manifest/uuid";
import pkg from "#package.json" with { type: "json" };

export * from "#/manifest/module";
export * from "#/manifest/settings";

/** An optional engine feature that a pack can enable. */
export type PackCapability = "chemistry" | "editorExtension" | "script_eval" | "raytraced" | "pbr";

/** Where players can apply a pack. */
export type PackScope = "global" | "world" | "system" | "any";

/** The minimum engine version of a manifest, unless {@link Manifest.minEngineVersion} sets one. */
export const DEFAULT_MIN_ENGINE_VERSION = "1.26.50";

const BEDFOX = "bedfox";

const NAME_SUFFIXES = { behavior: "BP", resource: "RP" } as const;

interface SubpackJson {
    name: string;
    folder_name: string;
    memory_performance_tier: number;
}

/**
 * The `manifest.json` file of a pack, in format version 3.
 *
 * The modules set the kind of pack. A {@link ResourcesModule} makes a resource pack. A
 * {@link DataModule} or a {@link ScriptModule} makes a behavior pack.
 *
 * The manifest derives its UUIDs from the namespace and the kind of pack. Thus the UUIDs stay the
 * same between builds.
 *
 * @example
 *     const rp = new Manifest("example").authors("arexon").module(new ResourcesModule());
 *     const bp = new Manifest("example")
 *         .authors("arexon")
 *         .module(
 *             new DataModule(),
 *             new ScriptModule("scripts/main.js").dependsOn("@minecraft/server", "2.1.0"),
 *         )
 *         .dependsOn(rp);
 */
export class Manifest implements PackOutput {
    /** The namespace that the manifest derives its UUIDs and its default name from. */
    readonly namespace: string;

    readonly path = "manifest.json";

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
    #generatedWith: Record<string, string[]> = { [BEDFOX]: [pkg.version] };
    #settings: Setting[] = [];
    #subpacks: SubpackJson[] = [];

    /** Creates a manifest for `namespace`. */
    constructor(namespace: string) {
        this.namespace = namespace;
    }

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

    /**
     * Sets the name that the game shows in the pack list.
     *
     * By default, the name is the namespace with `BP` or `RP`, e.g. `example RP`.
     */
    name(name: string): this {
        this.#name = name;
        return this;
    }

    /** Sets the description that the game shows under the name. */
    description(description: string): this {
        this.#description = description;
        return this;
    }

    /**
     * Sets the pack's version. The modules use this version, unless they set their own.
     *
     * @default "1.0.0"
     */
    version(version: Version): this {
        this.#version = version;
        return this;
    }

    /**
     * Sets the oldest game version that the pack supports, e.g. `1.26.50`.
     *
     * @default "1.26.50"
     */
    minEngineVersion(version: Version): this {
        this.#minEngineVersion = version;
        return this;
    }

    /** Sets where players can apply the pack, e.g. `world` to apply it only to worlds. */
    scope(scope: PackScope): this {
        this.#scope = scope;
        return this;
    }

    /** Sets the header UUID, instead of the UUID that the manifest derives from the namespace. */
    uuid(uuid: string): this {
        this.#uuid = uuid;
        return this;
    }

    /** Adds modules, in order. The manifest skips a module that it already has. */
    module(...modules: ManifestModule[]): this {
        for (const module of modules) {
            if (!this.#modules.includes(module)) this.#modules.push(module);
        }
        return this;
    }

    /**
     * Adds another pack as a dependency.
     *
     * The dependency uses the header UUID and the version that `pack` has when this manifest
     * serializes. The manifest skips a pack that is already a dependency.
     */
    dependsOn(pack: Manifest): this {
        if (!this.#dependencies.includes(pack)) this.#dependencies.push(pack);
        return this;
    }

    /** Enables optional engine features, e.g. `pbr`. The manifest skips a feature that is on. */
    capabilities(...names: PackCapability[]): this {
        for (const name of names) {
            if (!this.#capabilities.includes(name)) this.#capabilities.push(name);
        }
        return this;
    }

    /** Adds authors of the pack. */
    authors(...names: string[]): this {
        this.#authors.push(...names);
        return this;
    }

    /** Sets the pack's license, e.g. `MIT`. */
    license(license: string): this {
        this.#license = license;
        return this;
    }

    /** Sets the URL of the pack's home page. */
    url(url: string): this {
        this.#url = url;
        return this;
    }

    /**
     * Sets the pack's product type.
     *
     * The game accepts only `addon`, for packs that players add to worlds. The value doesn't change
     * how the pack works.
     */
    productType(productType: "addon"): this {
        this.#productType = productType;
        return this;
    }

    /**
     * Records the versions of another tool that helped to generate the manifest.
     *
     * The manifest always records Bedfox first, and a call with `bedfox` as `tool` does nothing. A
     * second call for the same tool replaces its versions.
     *
     * @example
     *     manifest.generatedWith("mctools", "0.12.0");
     */
    generatedWith(tool: string, ...versions: string[]): this {
        if (tool !== BEDFOX) this.#generatedWith[tool] = versions;
        return this;
    }

    /**
     * Adds settings that players can change in the pack's settings screen.
     *
     * The screen shows the settings in the order that this method gets them. The manifest skips a
     * setting that it already has. A manifest can have up to 50 settings.
     *
     * @example
     *     manifest.setting(
     *         new LabelSetting("Tune the explosions"),
     *         new ToggleSetting("example:explosions", "Explosions").default(true),
     *         new SliderSetting("example:power", "Power", 1, 4).default(3),
     *     );
     */
    setting(...settings: Setting[]): this {
        for (const setting of settings) {
            if (!this.#settings.includes(setting)) this.#settings.push(setting);
        }
        return this;
    }

    /**
     * Adds a subpack: a folder in `subpacks/` that players can select.
     *
     * `memoryPerformanceTier` is the memory tier of the subpack, from 0 to 5.
     */
    subpack(folderName: string, name: string, memoryPerformanceTier: number): this {
        this.#subpacks.push({
            name,
            folder_name: folderName,
            memory_performance_tier: memoryPerformanceTier,
        });
        return this;
    }

    toJSON(): unknown {
        const kind = this.kind;

        const header = {
            name: this.#name ?? `${this.namespace} ${NAME_SUFFIXES[kind]}`,
            description: this.#description,
            uuid: this.#headerUuid(),
            version: this.#version,
            min_engine_version: this.#minEngineVersion ?? DEFAULT_MIN_ENGINE_VERSION,
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
                try {
                    return { uuid: pack.#headerUuid(), version: pack.#version };
                } catch (error) {
                    if (!(error instanceof InvalidModulesError)) throw error;
                    throw new InvalidModulesError(
                        `dependency ${pack.#name ?? pack.namespace} isn't a behavior or resource pack`,
                        { cause: error },
                    );
                }
            }),
            ...moduleDependencies.values(),
        ];

        return {
            format_version: 3,
            header,
            modules,
            dependencies: dependencies.length > 0 ? dependencies : undefined,
            settings: this.#settings.length > 0 ? this.#settings : undefined,
            subpacks: this.#subpacks.length > 0 ? this.#subpacks : undefined,
            capabilities: this.#capabilities.length > 0 ? this.#capabilities : undefined,
            metadata: {
                authors: this.#authors.length > 0 ? this.#authors : undefined,
                url: this.#url,
                license: this.#license,
                product_type: this.#productType,
                generated_with: this.#generatedWith,
            },
        };
    }

    #headerUuid(): string {
        return this.#uuid ?? deriveUuid(`${this.namespace}/${this.kind}/header`);
    }
}

/**
 * Thrown by {@link Manifest.kind} and {@link Manifest.toJSON} when the modules don't make a behavior
 * or resource pack.
 */
export class InvalidModulesError extends TypeError {
    constructor(reason: string, options?: ErrorOptions) {
        super(`Invalid manifest modules: ${reason}`, options);
        this.name = "InvalidModulesError";
    }
}

/** Thrown by {@link Manifest.toJSON} when two modules have the same UUID. */
export class DuplicateModuleUuidError extends TypeError {
    constructor(uuid: string) {
        super(`Found more than one module with UUID ${uuid}`);
        this.name = "DuplicateModuleUuidError";
    }
}

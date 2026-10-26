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

/** An optional engine feature a pack can turn on, as the game registers them. */
export type PackCapability = "chemistry" | "editorExtension" | "script_eval" | "raytraced" | "pbr";

/** Where a pack can be applied. Packs without a scope can be applied anywhere. */
export type PackScope = "global" | "world" | "system" | "any";

/** The minimum engine version a registry's manifests get unless one is set. */
export const DEFAULT_MIN_ENGINE_VERSION = "1.26.50";

const BEDFOX = "bedfox";

const NAME_SUFFIXES = { behavior: "BP", resource: "RP" } as const;

/** A subpack as a manifest writes it in `subpacks`. */
interface SubpackJson {
    name: string;
    folder_name: string;
    memory_performance_tier: number;
}

/**
 * A V3 pack `manifest.json`.
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
    /** The namespace UUIDs and the default name are derived from. */
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
     * Which pack this is, from its modules.
     *
     * @throws - {@link InvalidModulesError} if there are no modules, or a resources module with
     *   behavior pack ones.
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

    /** Sets the name shown in the game's pack list. */
    name(name: string): this {
        this.#name = name;
        return this;
    }

    /** Sets the description shown under the name. */
    description(description: string): this {
        this.#description = description;
        return this;
    }

    /**
     * Sets the pack's version, which its modules share unless they set their own.
     *
     * @default "1.0.0"
     */
    version(version: Version): this {
        this.#version = version;
        return this;
    }

    /**
     * Sets the oldest game version the pack is made for, e.g. `1.26.50`.
     *
     * @default "1.26.50"
     */
    minEngineVersion(version: Version): this {
        this.#minEngineVersion = version;
        return this;
    }

    /** Sets where the pack can be applied, e.g. `world` for packs only applied to worlds. */
    scope(scope: PackScope): this {
        this.#scope = scope;
        return this;
    }

    /** Sets the header UUID, instead of the one derived from the namespace. */
    uuid(uuid: string): this {
        this.#uuid = uuid;
        return this;
    }

    /** Adds modules, in order. Adding a module that's already here does nothing. */
    module(...modules: ManifestModule[]): this {
        for (const module of modules) {
            if (!this.#modules.includes(module)) this.#modules.push(module);
        }
        return this;
    }

    /**
     * Depends on another pack, by its header UUID and version as they are when this is serialized.
     * Depending on the same manifest again does nothing.
     */
    dependsOn(pack: Manifest): this {
        if (!this.#dependencies.includes(pack)) this.#dependencies.push(pack);
        return this;
    }

    /** Turns on optional engine features, e.g. `pbr`. Turning one on again does nothing. */
    capabilities(...names: PackCapability[]): this {
        for (const name of names) {
            if (!this.#capabilities.includes(name)) this.#capabilities.push(name);
        }
        return this;
    }

    /** Adds to the pack's authors. */
    authors(...names: string[]): this {
        this.#authors.push(...names);
        return this;
    }

    /** Sets the pack's license, e.g. `MIT`. */
    license(license: string): this {
        this.#license = license;
        return this;
    }

    /** Sets the pack's home page. */
    url(url: string): this {
        this.#url = url;
        return this;
    }

    /**
     * Sets what the pack is made for. `addon`, for packs added to worlds, is the only value the
     * game accepts, and it doesn't change how the pack works.
     */
    productType(productType: "addon"): this {
        this.#productType = productType;
        return this;
    }

    /**
     * Records the versions of another tool that generated the manifest, e.g. `mctools` at `0.12.0`.
     * Bedfox always records itself first, and this can't replace that entry.
     */
    generatedWith(tool: string, ...versions: string[]): this {
        if (tool !== BEDFOX) this.#generatedWith[tool] = versions;
        return this;
    }

    /**
     * Adds settings players can change in the pack's settings screen, in order. Adding a setting
     * that's already here does nothing. A manifest has up to 50 settings.
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

    /** Adds a subpack, a folder under `subpacks/` that players can pick by memory tier, 0 to 5. */
    subpack(folderName: string, name: string, memoryPerformanceTier: number): this {
        this.#subpacks.push({
            name,
            folder_name: folderName,
            memory_performance_tier: memoryPerformanceTier,
        });
        return this;
    }

    /**
     * @throws - {@link InvalidModulesError} if the modules don't make a behavior or resource pack.
     * @throws - {@link DuplicateModuleUuidError} if two modules have the same UUID.
     */
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
            ...this.#dependencies.map((pack) => ({
                uuid: pack.#headerUuid(),
                version: pack.#version,
            })),
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

/** An error caused by modules that don't make a behavior or resource pack. */
export class InvalidModulesError extends TypeError {
    constructor(reason: string) {
        super(`Invalid manifest modules: ${reason}`);
        this.name = "InvalidModulesError";
    }
}

/** An error caused by two modules in one manifest with the same UUID. */
export class DuplicateModuleUuidError extends TypeError {
    constructor(uuid: string) {
        super(`Found more than one module with UUID ${uuid}`);
        this.name = "DuplicateModuleUuidError";
    }
}

import { type Plugin, type Project, type Registry, system } from "@bedfox/core";
import corePkg from "@bedfox/core/package.json" with { type: "json" };

import { engineVersion } from "#/manifest/engine_version";
import { BehaviorManifest, ResourceManifest } from "#/manifest/index";
import { deriveUuid } from "#/manifest/uuid";
import pkg from "#package.json" with { type: "json" };

/**
 * The min engine version that {@link ManifestPlugin} sets. It is the game version that this package
 * targets, e.g. `1.26.70`.
 */
export const DEFAULT_MIN_ENGINE_VERSION = engineVersion(pkg.version);

const NAME_SUFFIXES = { behavior: "BP", resource: "RP" } as const;

/**
 * Adds the plugins that every Add-On needs: {@link ManifestPlugin}.
 *
 * A project holds one plugin of each class, so a project with this plugin can't also add one of its
 * plugins. To leave out one plugin, add the others one by one instead.
 *
 * @example
 *     new Project("example").addPlugin(new DefaultPlugin());
 */
export class DefaultPlugin implements Plugin {
    build(project: Project): void {
        project.addPlugin(new ManifestPlugin());
    }
}

/**
 * Adds the {@link BehaviorManifest} and the {@link ResourceManifest} to each run.
 *
 * Before every other setup system, it sets these values on both manifests:
 *
 * - The name: the namespace with `BP` or `RP`, e.g. `example RP`.
 * - A header UUID that it derives from the namespace and the kind of pack. Thus the UUIDs stay the
 *   same between builds.
 * - The min engine version: {@link DEFAULT_MIN_ENGINE_VERSION}.
 * - Two entries in `generated_with`: `@bedfox/core` and `@bedfox/minecraft`, with their versions.
 *
 * The other systems run later, so they can change these values. Each pack depends on the other.
 */
export class ManifestPlugin implements Plugin {
    build(project: Project): void {
        project.addSystem("setup", system(addManifests).beforeAll());
    }
}

function addManifests(reg: Registry): void {
    const bp = reg.resource(BehaviorManifest);
    const rp = reg.resource(ResourceManifest);
    for (const manifest of [bp, rp]) {
        manifest
            .setName(`${reg.namespace} ${NAME_SUFFIXES[manifest.kind]}`)
            .setUuid(deriveUuid(`${reg.namespace}/${manifest.kind}/header`))
            .setMinEngineVersion(DEFAULT_MIN_ENGINE_VERSION)
            .setGeneratedWith(corePkg.name, corePkg.version)
            .setGeneratedWith(pkg.name, pkg.version);
    }
    bp.addDependency(rp);
    rp.addDependency(bp);
}

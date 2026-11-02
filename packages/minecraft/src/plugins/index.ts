import { ordered, type Plugin, type Project, type Registry } from "@bedfox/core";
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
 * - A `bedfox` entry in `generated_with`, with the versions of `@bedfox/core` and
 *   `@bedfox/minecraft`.
 *
 * The other systems run later, so they can change these values. Each pack depends on the other.
 */
export class ManifestPlugin implements Plugin {
    build(project: Project): void {
        project.addSystem("setup", ordered(addManifests).beforeAll());
    }
}

function addManifests(reg: Registry): void {
    const bp = reg.resource(BehaviorManifest);
    const rp = reg.resource(ResourceManifest);
    for (const manifest of [bp, rp]) {
        const kind = manifest.kind;
        manifest
            .name(`${reg.namespace} ${NAME_SUFFIXES[kind]}`)
            .uuid(deriveUuid(`${reg.namespace}/${kind}/header`))
            .minEngineVersion(DEFAULT_MIN_ENGINE_VERSION)
            .generatedWith("bedfox", corePkg.version, pkg.version);
    }
    bp.dependsOn(rp);
    rp.dependsOn(bp);
}

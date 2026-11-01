import type { Plugin, Project } from "@bedfox/core";

import { BehaviorManifest, ResourceManifest } from "#/manifest/index";

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
 * The behavior pack depends on the resource pack.
 */
export class ManifestPlugin implements Plugin {
    build(project: Project): void {
        project.addSystem("setup", (reg) => {
            const bp = reg.resource(BehaviorManifest);
            const rp = reg.resource(ResourceManifest);
            bp.dependsOn(rp);
            rp.dependsOn(bp);
        });
    }
}

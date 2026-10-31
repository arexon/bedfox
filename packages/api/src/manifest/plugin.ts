import { BehaviorManifest, ResourceManifest } from "#/manifest/index";
import type { Plugin } from "#/project/plugin";
import type { Project } from "#/project/project";

/**
 * Adds the {@link BehaviorManifest} and the {@link ResourceManifest} to each run.
 *
 * The behavior pack depends on the resource pack.
 */
export class ManifestPlugin implements Plugin {
    build(project: Project): void {
        project.addSystem("setup", (reg) => {
            reg.resource(BehaviorManifest).dependsOn(reg.resource(ResourceManifest));
        });
    }
}

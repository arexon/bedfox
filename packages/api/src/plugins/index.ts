import { ManifestPlugin } from "#/manifest/index";
import type { Plugin } from "#/project/plugin";
import type { Project } from "#/project/project";

/**
 * Adds the plugins that every add-on needs: {@link ManifestPlugin}.
 *
 * A project holds one plugin of each class, so a project with this plugin can't also add one of its
 * plugins. To leave out one plugin, add the others one by one instead.
 *
 * @example
 *     new Project({ namespace: "example" }).addPlugin(new DefaultPlugin());
 */
export class DefaultPlugin implements Plugin {
    build(project: Project): void {
        project.addPlugin(new ManifestPlugin());
    }
}

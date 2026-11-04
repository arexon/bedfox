import type { Version } from "#/manifest/module";

export function engineVersion(packageVersion: string): Version {
    return packageVersion.split(/[-+]/u)[0] as Version;
}

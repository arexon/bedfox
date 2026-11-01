import type { Version } from "#/manifest/module";

/** Returns the game version of a package version, e.g. `1.26.70` for `1.26.70-preview.22`. */
export function engineVersion(packageVersion: string): Version {
    return packageVersion.split(/[-+]/)[0] as Version;
}

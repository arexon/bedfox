/** The format version of a definition file, e.g. `1.26.50`. */
export class FormatVersion {
    /** The major, minor and patch numbers. */
    version: [number, number, number];

    constructor(major: number, minor: number, patch: number) {
        this.version = [major, minor, patch];
    }

    toJSON(): string {
        return this.version.join(".");
    }
}

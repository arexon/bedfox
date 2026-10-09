/** A definition's format version, serialized as `"major.minor.patch"`. */
export class FormatVersion {
    version: [number, number, number];

    constructor(major: number, minor: number, patch: number) {
        this.version = [major, minor, patch];
    }

    toJSON(): string {
        return this.version.join(".");
    }
}

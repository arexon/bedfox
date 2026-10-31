/** A kind of pack. */
export type PackKind = "behavior" | "resource";

/** An object that becomes a file in a pack. */
export interface PackOutput {
    /** The kind of pack that holds the file. */
    readonly kind: PackKind;
    /** The file's path from the pack's root. */
    readonly path: string;
}

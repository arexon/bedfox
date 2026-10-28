/** The pack that holds a file. */
export type PackKind = "behavior" | "resource";

/** Something that becomes a file in a pack. */
export interface PackOutput {
    readonly kind: PackKind;
    /** The file's path from the pack's root. */
    readonly path: string;
}

/** Which pack a file is written in. */
export type PackKind = "behavior" | "resource";

/** Something written to a file in a pack. */
export interface PackOutput {
    readonly kind: PackKind;
    /** The file's path from the pack's root. */
    readonly path: string;
}

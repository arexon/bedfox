/** A kind of pack. */
export type PackKind = "behavior" | "resource";

/** The project data that an output needs to generate its contents. */
export interface EmitContext {
    /** The project's namespace, e.g. `example` in `example:dirt`. */
    readonly namespace: string;
}

/**
 * The contents of a pack file. `format` tells how to write `value`.
 *
 * - `json`: a value for `JSON.stringify()`.
 * - `text`: the text of the file.
 */
export type Emitted =
    | { readonly format: "json"; readonly value: unknown }
    | { readonly format: "text"; readonly value: string };

/** An object that becomes a file in a pack. */
export interface PackOutput {
    /** The kind of pack that holds the file. */
    readonly kind: PackKind;
    /** The file's path from the pack's root. */
    readonly path: string;
    /** Generates the contents of the file. */
    emit(ctx: EmitContext): Emitted;
}

/** A pack file that {@link FrozenRegistry.emit} generates. */
export type PackFile = {
    /** The kind of pack that holds the file. */
    readonly kind: PackKind;
    /** The file's path from the pack's root. */
    readonly path: string;
} & Emitted;

import type { EmitContext, Emitted, PackKind, PackOutput } from "#/output";

/**
 * A pack file that a registry holds at most one of for each class, such as a manifest.
 *
 * {@link Registry.resource} creates the resource the first time that it gets the class. Thus a
 * resource class needs a constructor without arguments.
 */
export abstract class Resource implements PackOutput {
    /** The kind of pack that holds this resource. */
    abstract get kind(): PackKind;

    /** The path of this resource's file from the pack's root. */
    abstract get path(): string;

    /** Generates the contents of this resource's file. */
    abstract emit(ctx: EmitContext): Emitted;

    /**
     * Returns `true` if the resource has no data to write. {@link FrozenRegistry.emit} skips empty
     * resources.
     *
     * By default, it returns `false`.
     */
    isEmpty(): boolean {
        return false;
    }
}

/** A resource class that {@link Registry.resource} can create. */
export type ResourceCtor<T extends Resource = Resource> = new () => T;

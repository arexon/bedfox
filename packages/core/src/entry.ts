import type { EmitContext, Emitted, PackKind, PackOutput } from "#/output";

/**
 * A pack file that a registry holds many of, such as a block or a feature.
 *
 * {@link Registry.add} adds entries. Each entry has a {@link key} that {@link Registry.resolve} and
 * references find it by. An entry can point to other entries, see {@link references}.
 */
export abstract class Entry implements PackOutput {
    /** The kind of pack that holds this entry. */
    abstract get kind(): PackKind;

    /** The path of this entry's file from the pack's root. */
    abstract get path(): string;

    /**
     * Converts `key` to the form that {@link key} returns, e.g. removes the namespace.
     *
     * By default, it returns `key` with no change.
     */
    static normalizeKey(key: string, _namespace: string): string {
        return key;
    }

    /** Generates the contents of this entry's file. */
    abstract emit(ctx: EmitContext): Emitted;

    /** Returns the key that finds this entry, e.g. the identifier of a definition. */
    abstract key(): string;

    /**
     * Returns the entries that this entry points to.
     *
     * {@link Registry.add} also adds each target that is an entry instance.
     */
    references(): Reference[] {
        return [];
    }

    /**
     * Returns the value that other files use to point to this entry.
     *
     * An entry inside the fields of another value serializes as this value. By default, it is
     * {@link key}.
     */
    toReference(_ctx?: EmitContext): string {
        return this.key();
    }

    /** Calls `callback` with this entry only if `condition` is true. */
    if(condition: boolean, callback: (entry: this) => void): this {
        if (condition) callback(this);
        return this;
    }

    /** Calls `callback` with this entry once for each element of `array`, in order. */
    iterateOn<T>(array: T[], callback: (entry: this, element: T, index: number) => void): this {
        for (let i = 0; i < array.length; i++) callback(this, array[i], i);
        return this;
    }
}

/** Any concrete or abstract entry class. */
export type EntryCtor<T extends Entry = Entry> = (abstract new (...args: never[]) => T) & {
    normalizeKey(key: string, namespace: string): string;
};

/** A reference from an entry to another entry. */
export interface Reference {
    /** The class of the entry that the reference points to. */
    ctor: EntryCtor;
    /** The entry that the reference points to, or its key. */
    target: Entry | string;
}

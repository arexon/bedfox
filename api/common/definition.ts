import type { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import type { BlockDescriptor } from "./descriptor.ts";
import type { InstanceProps } from "./props.ts";

export type DefinitionProps<T> = Partial<
    InstanceProps<T, "identifier" | "fallbackFormatVersion">
>;

/**
 * A definition is a top-level JSON file in the RP or BP, usually containing
 * data under a `minecraft:<definition>` property. This includes definitions
 * such as blocks, items, entities, features, etc.
 */
export abstract class Definition {
    /**
     * The format version of this definition.
     *
     * Falls back to {@link Definition.fallbackFormatVersion} if no explicit
     * version is set.
     */
    @Ser({
        custom(fv) {
            if (fv === undefined) return this.fallbackFormatVersion;
            return fv;
        },
    })
    formatVersion?: FormatVersion;

    /** The latest minimum fallback format version for the definition. */
    abstract get fallbackFormatVersion(): FormatVersion;

    abstract identifier: string;

    if(condition: boolean, callback: (def: this) => void): this {
        if (condition) callback(this);
        return this;
    }

    iterateOn<T>(
        array: T[],
        callback: (def: this, element: T, index: number) => void,
    ): this {
        for (let i = 0; i < array.length; i++) callback(this, array[i], i);
        return this;
    }

    /** Internal. Everything this definition directly references. */
    _references(): Reference[] {
        return [];
    }

    /** Internal. Directly nested definition instances. */
    _resolveInstances(): Definition[] {
        return this._references()
            .map((ref) => ref.target)
            .filter((target) => target instanceof Definition);
    }
}

/** How a definition relates to something it references. */
export const enum Relation {
    /** The referrer places the target in the world. */
    Places,
    /** The referrer conditions on the target (may replace, may attach to, allowlists). */
    Requires,
}

export type ReferenceTarget = Definition | BlockDescriptor | string;

export interface Reference {
    relation: Relation;
    target: ReferenceTarget;
}

import type { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
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

    /** Internal. Resolves all of the nested definitions recursively. */
    abstract _resolveInstances(): Definition[];

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
}

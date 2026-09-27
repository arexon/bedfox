import type { Filter } from "@bedfox/api/registry";
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
    _references(): ReferenceTarget[] {
        return [];
    }

    /** Internal. Directly nested definition instances. */
    _referencedInstances(): Definition[] {
        return this._references().filter((ref) => ref instanceof Definition);
    }

    /** Matches definitions nothing else in the registry references. */
    static orphan(): Filter<Definition> {
        return (def, reg) => !reg.isReferenced(def);
    }
}

/** Any concrete or abstract definition class. */
export type DefinitionCtor<T extends Definition = Definition> = abstract new (
    ...args: never[]
) => T;

export type ReferenceTarget = Definition | BlockDescriptor | string;

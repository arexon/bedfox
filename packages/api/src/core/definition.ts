import type { Ctor, InstanceProps } from "#/core/props";
import type { BlockDescriptor, FormatVersion } from "#/primitive/index";
import type { Filter } from "#/registry";
import { setLayout, toReference } from "#/serialize";

export type DefinitionProps<T> = Partial<InstanceProps<T, "identifier">>;

/**
 * A definition is a top-level JSON file in the RP or BP, usually containing data under a
 * `minecraft:<definition>` property. This includes definitions such as blocks, items, entities,
 * features, etc.
 */
export abstract class Definition {
    /** A base for a definition class written under `root`, e.g. `minecraft:block`. */
    static of<C extends Ctor<Definition>>(this: C, root: string, formatVersion: FormatVersion): C {
        abstract class Base extends this {}
        // A definition file nests every field under the root key, except the format version, with
        // the identifier first in `description`.
        setLayout(Base, (json) => {
            const { format_version, identifier, description, ...body } = json as Record<
                string,
                unknown
            >;
            return {
                format_version: format_version ?? formatVersion,
                [root]: {
                    description: { identifier, ...(description as object | undefined) },
                    ...body,
                },
            };
        });
        return Base;
    }

    /** The format version of this definition. */
    formatVersion?: FormatVersion;

    abstract identifier: string;

    [toReference](): string {
        return this.identifier;
    }

    if(condition: boolean, callback: (def: this) => void): this {
        if (condition) callback(this);
        return this;
    }

    iterateOn<T>(array: T[], callback: (def: this, element: T, index: number) => void): this {
        for (let i = 0; i < array.length; i++) callback(this, array[i], i);
        return this;
    }

    /** Internal. Everything this definition directly references. */
    _references(): Reference[] {
        return [];
    }

    /** Internal. Directly nested definition instances. */
    _referencedInstances(): Definition[] {
        return this._references()
            .map((ref) => ref.target)
            .filter((target) => target instanceof Definition);
    }

    /** Matches definitions nothing else in the registry references. */
    static orphan(): Filter {
        return (def, reg) => !reg.isReferenced(def);
    }
}

/** Any concrete or abstract definition class. */
export type DefinitionCtor<T extends Definition = Definition> = abstract new (
    ...args: never[]
) => T;

export type ReferenceTarget = Definition | BlockDescriptor | string;

/** A reference to a definition of a given kind. */
export interface Reference {
    kind: DefinitionCtor;
    target: ReferenceTarget;
}

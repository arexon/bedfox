import type { BRAND } from "#/core/brand";
import type { PackKind, PackOutput } from "#/core/output";
import type { InstanceProps } from "#/core/props";
import type { BlockDescriptor, FormatVersion } from "#/primitive/index";
import { serialize, TO_REFERENCE } from "#/serialize";

export const NAMESPACE: unique symbol = Symbol("namespace");

export type DefinitionProps<T> = Partial<InstanceProps<T, typeof NAMESPACE>>;

/** The pack and the folder that hold a kind of definition. */
export interface DefinitionLocation {
    kind: PackKind;
    folder: string;
}

const IDENTIFIER_REG = /^[a-z0-9._-]+$/;

/** A top-level JSON file in a resource or behavior pack, such as a block, item, entity or feature. */
export abstract class Definition implements PackOutput {
    declare static readonly defaultFormatVersion: FormatVersion;

    declare static readonly location: DefinitionLocation;

    declare readonly [BRAND]: string;

    declare [NAMESPACE]?: string;

    /** Overrides the class's default format version. */
    @serialize({
        override: (v, def) => v ?? (def.constructor as typeof Definition).defaultFormatVersion,
    })
    formatVersion?: FormatVersion;

    @serialize({ override: (_, def) => def.qualifiedIdentifier })
    readonly identifier!: string;

    /**
     * @throws - {@link InvalidIdentifierError} if `identifier` has a namespace or characters other
     *   than `a-z`, `0-9`, `.`, `_` and `-`.
     */
    constructor(identifier: string) {
        if (!IDENTIFIER_REG.test(identifier)) throw new InvalidIdentifierError(identifier);
    }

    /**
     * The identifier with the namespace of this definition's registry, e.g. `example:dirt` for
     * `dirt`. An unregistered definition returns its identifier unchanged.
     */
    get qualifiedIdentifier(): string {
        const namespace = this[NAMESPACE];
        return namespace === undefined ? this.identifier : `${namespace}:${this.identifier}`;
    }

    /** The pack that holds this definition. */
    get kind(): PackKind {
        return (this.constructor as typeof Definition).location.kind;
    }

    /** This definition's path in its pack, e.g. `blocks/dirt.json`. */
    get path(): string {
        return `${(this.constructor as typeof Definition).location.folder}/${this.identifier}.json`;
    }

    [TO_REFERENCE](): string {
        return this.qualifiedIdentifier;
    }

    if(condition: boolean, callback: (def: this) => void): this {
        if (condition) callback(this);
        return this;
    }

    iterateOn<T>(array: T[], callback: (def: this, element: T, index: number) => void): this {
        for (let i = 0; i < array.length; i++) callback(this, array[i], i);
        return this;
    }

    _references(): Reference[] {
        return [];
    }

    _referencedInstances(): Definition[] {
        return this._references()
            .map((ref) => ref.target)
            .filter((target) => target instanceof Definition);
    }
}

/** Any concrete or abstract definition class. */
export type DefinitionCtor<T extends Definition = Definition> = abstract new (
    ...args: never[]
) => T;

export type ReferenceTarget = Definition | BlockDescriptor | string;

/** A reference to a definition of a given class. */
export interface Reference {
    ctor: DefinitionCtor;
    target: ReferenceTarget;
}

/** An error caused by an identifier that can't name a definition's file. */
export class InvalidIdentifierError extends TypeError {
    constructor(id: string) {
        super(
            `Invalid identifier: ${id}, expected only a-z, 0-9, ".", "_" and "-", without a namespace`,
        );
        this.name = "InvalidIdentifierError";
    }
}

import type { BRAND } from "#/core/brand";
import type { PackKind, PackOutput } from "#/core/output";
import type { InstanceProps } from "#/core/props";
import type { BlockDescriptor, FormatVersion } from "#/primitive/index";
import { serialize, TO_REFERENCE } from "#/serialize";

export const NAMESPACE: unique symbol = Symbol("namespace");

/**
 * The fields that a definition's constructor accepts. All fields are optional. See
 * {@link InstanceProps}.
 */
export type DefinitionProps<T> = Partial<InstanceProps<T, typeof NAMESPACE>>;

/** The pack and the folder that hold one kind of definition. */
export interface DefinitionLocation {
    /** The kind of pack that holds the files. */
    kind: PackKind;
    /** The folder from the pack's root, e.g. `blocks`. */
    folder: string;
}

const IDENTIFIER_REG = /^[a-z0-9._-]+$/;

/**
 * A JSON file in a behavior or resource pack, such as a block, an item, an entity or a feature.
 *
 * A definition has an identifier without a namespace, e.g. `dirt`. The identifier also names the
 * file, see {@link path}. When a registry adds the definition, the definition gets the namespace of
 * the registry, see {@link qualifiedIdentifier}.
 */
export abstract class Definition implements PackOutput {
    /** The format version of this class's files, unless {@link formatVersion} sets one. */
    declare static readonly defaultFormatVersion: FormatVersion;

    /** The pack and the folder that hold this class's files. */
    declare static readonly location: DefinitionLocation;

    declare readonly [BRAND]: string;

    declare [NAMESPACE]?: string;

    /** The format version of this file, instead of {@link Definition.defaultFormatVersion}. */
    @serialize({
        override: (v, def) => v ?? (def.constructor as typeof Definition).defaultFormatVersion,
    })
    formatVersion?: FormatVersion;

    /** The identifier without a namespace, e.g. `dirt`. */
    @serialize({ override: (_, def) => def.qualifiedIdentifier })
    readonly identifier!: string;

    /**
     * Checks that `identifier` can name a file.
     *
     * @throws - {@link InvalidIdentifierError} if `identifier` isn't valid.
     */
    constructor(identifier: string) {
        if (!IDENTIFIER_REG.test(identifier)) throw new InvalidIdentifierError(identifier);
    }

    /**
     * The identifier with the namespace of this definition's registry, e.g. `example:dirt`.
     *
     * If no registry holds the definition, this is the identifier without a namespace.
     */
    get qualifiedIdentifier(): string {
        const namespace = this[NAMESPACE];
        return namespace === undefined ? this.identifier : `${namespace}:${this.identifier}`;
    }

    /** The kind of pack that holds this definition. */
    get kind(): PackKind {
        return (this.constructor as typeof Definition).location.kind;
    }

    /** The path of this definition's file from the pack's root, e.g. `blocks/dirt.json`. */
    get path(): string {
        return `${(this.constructor as typeof Definition).location.folder}/${this.identifier}.json`;
    }

    [TO_REFERENCE](): string {
        return this.qualifiedIdentifier;
    }

    /** Calls `callback` with this definition only if `condition` is true. */
    if(condition: boolean, callback: (def: this) => void): this {
        if (condition) callback(this);
        return this;
    }

    /** Calls `callback` with this definition once for each element of `array`, in order. */
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

/** The target of a {@link Reference}: a definition, a block descriptor or an identifier. */
export type ReferenceTarget = Definition | BlockDescriptor | string;

/** A reference from a definition to another definition. */
export interface Reference {
    /** The class of the definition that the reference points to. */
    ctor: DefinitionCtor;
    /** The definition that the reference points to, or its identifier or block descriptor. */
    target: ReferenceTarget;
}

/**
 * Thrown by the {@link Definition} constructor when an identifier has a namespace, or has
 * characters other than `a-z`, `0-9`, `.`, `_` and `-`.
 */
export class InvalidIdentifierError extends TypeError {
    constructor(id: string) {
        super(
            `Invalid identifier: ${id}, expected only a-z, 0-9, ".", "_" and "-", without a namespace`,
        );
        this.name = "InvalidIdentifierError";
    }
}

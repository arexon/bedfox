import {
    type EmitContext,
    type Emitted,
    Entry,
    type EntryCtor,
    type PackKind,
    serialize,
    toJson,
} from "@bedfox/core";

import type { InstanceProps } from "#/definition/props";
import type { FormatVersion } from "#/primitive/index";

/**
 * The fields that a definition's constructor accepts. All fields are optional. See
 * {@link InstanceProps}.
 */
export type DefinitionProps<T> = Partial<InstanceProps<T>>;

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
 * file, see {@link path}. When the definition is written, its identifier gets the project's
 * namespace, see {@link qualifiedIdentifier}.
 */
export abstract class Definition extends Entry {
    /** The format version of this class's files, unless {@link formatVersion} sets one. */
    declare static readonly defaultFormatVersion: FormatVersion;

    /** The pack and the folder that hold this class's files. */
    declare static readonly location: DefinitionLocation;

    /** The format version of this file, instead of {@link Definition.defaultFormatVersion}. */
    @serialize({
        override: (v, def) => v ?? (def.constructor as typeof Definition).defaultFormatVersion,
    })
    formatVersion?: FormatVersion;

    /** The identifier without a namespace, e.g. `dirt`. */
    @serialize({ override: (_, def, ctx) => def.toReference(ctx) })
    readonly identifier!: string;

    /**
     * Checks that `identifier` can name a file.
     *
     * @throws - {@link InvalidIdentifierError} if `identifier` isn't valid.
     */
    constructor(identifier: string) {
        super();
        if (!IDENTIFIER_REG.test(identifier)) throw new InvalidIdentifierError(identifier);
    }

    /** Removes `namespace` from `key`, e.g. `example:dirt` becomes `dirt`. */
    static override normalizeKey(key: string, namespace: string): string {
        const prefix = `${namespace}:`;
        return key.startsWith(prefix) ? key.slice(prefix.length) : key;
    }

    /** The kind of pack that holds this definition. */
    get kind(): PackKind {
        return (this.constructor as typeof Definition).location.kind;
    }

    /** The path of this definition's file from the pack's root, e.g. `blocks/dirt.json`. */
    get path(): string {
        return `${(this.constructor as typeof Definition).location.folder}/${this.identifier}.json`;
    }

    /**
     * Returns the identifier with the namespace of `ctx`, e.g. `example:dirt`.
     *
     * A registry has a namespace, so a system can pass its registry as `ctx`.
     *
     * @example
     *     project.addSystem((reg) => {
     *         const id = dirt.qualifiedIdentifier(reg);
     *     });
     */
    qualifiedIdentifier(ctx: EmitContext): string {
        return `${ctx.namespace}:${this.identifier}`;
    }

    /** Returns the identifier. */
    key(): string {
        return this.identifier;
    }

    /** Generates the JSON of this definition's file. */
    emit(ctx: EmitContext): Emitted {
        return { format: "json", value: toJson(this, ctx) };
    }

    /**
     * Returns the identifier that other files use for this definition.
     *
     * With `ctx`, it is {@link qualifiedIdentifier}. Without `ctx`, it is {@link identifier}.
     */
    override toReference(ctx?: EmitContext): string {
        return ctx === undefined ? this.identifier : this.qualifiedIdentifier(ctx);
    }
}

/** Any concrete or abstract definition class. */
export type DefinitionCtor<T extends Definition = Definition> = EntryCtor<T>;

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

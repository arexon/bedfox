import {
    Definition,
    type DefinitionCtor,
    NAMESPACE,
    type Reference,
    type ReferenceTarget,
} from "#/core/definition";
import type { PackKind } from "#/core/output";
import { autoIdentifier } from "#/core/references";
import { Manifest } from "#/manifest/index";
import { DataModule, ResourcesModule } from "#/manifest/module";

export const INVALIDATE: unique symbol = Symbol("invalidate");
export const CLOSE: unique symbol = Symbol("close");
export const RELEASE: unique symbol = Symbol("release");

/** A registry's pack manifests. */
export interface RegistryManifests {
    readonly bp: Manifest;
    readonly rp: Manifest;
}

/**
 * Holds a project's definitions during one run. Systems get the registry as their parameter. Only a
 * `Project` creates registries: each run of a project gets a new one.
 *
 * A registry stores definitions by identifier without a namespace, e.g. `dirt`. References to them
 * may use either form, e.g. `dirt` or `example:dirt`.
 *
 * The registry closes when its run ends. After that, it can still be read, but `add()` and
 * `remove()` throw {@link RegistryClosedError}. The next run of the project empties it.
 *
 * @example
 *     // Remove features that nothing places.
 *     project.addSystem(
 *         "finalize",
 *         query(Feature)
 *             .orphan()
 *             .intoSystem((reg, features) => reg.remove(...features)),
 *     );
 */
export class Registry {
    /** The namespace of this registry's definitions, e.g. `example` in `example:dirt`. */
    readonly namespace: string;

    /** The behavior and resource pack manifests. */
    readonly manifests: RegistryManifests;

    #members = new Set<Definition>();
    #closed = false;
    #referenced?: Map<string, Reference[]>;
    #byIdentifier?: Map<string, Definition[]>;
    #byPath: Record<PackKind, Map<string, Definition>> = {
        behavior: new Map(),
        resource: new Map(),
    };

    constructor(namespace: string) {
        this.namespace = namespace;

        const rp = new Manifest(namespace).module(new ResourcesModule());
        const bp = new Manifest(namespace).module(new DataModule()).dependsOn(rp);
        this.manifests = { bp, rp };
    }

    /**
     * Registers definitions, along with any definition instances they reference. A definition
     * belongs to one registry at a time, and serializes with its namespace, e.g. `example:dirt`.
     * Adding a definition that's already here does nothing. Definitions of different kinds, such as
     * a block and a feature, may share an identifier.
     *
     * @example
     *     const ore = new OreFeature("dirt_ore").add("example:dirt", ["minecraft:stone"]);
     *     // Registers `dirt_ore` too, since `scatter` holds the instance.
     *     reg.add(new ScatterFeature("scatter", { placesFeature: ore }));
     *
     * @throws - {@link AlreadyRegisteredError} if a definition is in another registry.
     * @throws - {@link DuplicateIdentifierError} if another definition here uses the same file,
     *   e.g. a second block called `dirt`.
     * @throws - {@link RegistryClosedError} if the registry's run has ended.
     */
    add(...defs: Definition[]): this {
        this.#assertOpen();
        for (const def of defs) {
            if (this.#members.has(def)) continue;
            const namespace = def[NAMESPACE];
            if (namespace !== undefined)
                throw new AlreadyRegisteredError(def.identifier, namespace);
            const paths = this.#byPath[def.kind];
            const taken = paths.get(def.path);
            if (taken !== undefined) throw new DuplicateIdentifierError(taken, def);
            // Register the definition before its references, so that a reference cycle ends here.
            paths.set(def.path, def);
            this.#members.add(def);
            def[NAMESPACE] = this.namespace;
            try {
                this.add(...def._referencedInstances());
            } catch (error) {
                this.remove(def);
                throw error;
            }
        }
        this.#invalidate();
        return this;
    }

    /**
     * Unregisters definitions. They then serialize without a namespace, and another registry can
     * add them. Removing a definition that isn't here does nothing. Definitions that they reference
     * stay registered.
     *
     * @throws - {@link RegistryClosedError} if the registry's run has ended.
     */
    remove(...defs: Definition[]): void {
        this.#assertOpen();
        this.#unregister(defs);
    }

    #unregister(defs: Iterable<Definition>): void {
        for (const def of defs) {
            if (!this.#members.delete(def)) continue;
            delete def[NAMESPACE];
            this.#byPath[def.kind].delete(def.path);
        }
        this.#invalidate();
    }

    #assertOpen(): void {
        if (this.#closed) throw new RegistryClosedError();
    }

    /**
     * @yields Each {@link Definition} in the registry when iteration starts, in the order that the
     *   registry added them. It skips definitions added or removed during iteration.
     */
    *all(): Generator<Definition, void, unknown> {
        const snapshot = Array.from(this.#members);
        for (const def of snapshot) {
            if (this.#members.has(def)) yield def;
        }
    }

    /**
     * Finds definitions by class and identifier, with or without this registry's namespace, in the
     * order that the registry added them. Each file holds only one definition, so a class like
     * `Block` finds at most one. A base class like `Definition` may find a block and a feature.
     *
     * @example
     *     reg.resolve(Block, "dirt"); // [dirt]
     *     reg.resolve(Block, "example:dirt"); // Same block.
     */
    resolve<T extends Definition>(ctor: DefinitionCtor<T>, id: string): T[] {
        this.#byIdentifier ??= Map.groupBy(this.#members, (def) => def.identifier);
        const defs = this.#byIdentifier.get(this.#stripNamespace(id)) ?? [];
        return defs.filter((def): def is T => def instanceof ctor);
    }

    /**
     * Whether `ref` points at `target`. A class matches when `ref` resolves to a registered
     * instance of it. Any other target matches by identifier, and the match ignores this registry's
     * namespace. A definition target must also be an instance of {@link Reference.ctor}.
     */
    matches(ref: Reference, target: DefinitionCtor | ReferenceTarget): boolean {
        const id = autoIdentifier(ref.target);
        if (typeof target === "function") {
            return this.resolve(ref.ctor, id).some((def) => def instanceof target);
        }
        if (target instanceof Definition && !(target instanceof ref.ctor)) return false;
        return this.#stripNamespace(id) === this.#stripNamespace(autoIdentifier(target));
    }

    #stripNamespace(id: string): string {
        const prefix = `${this.namespace}:`;
        return id.startsWith(prefix) ? id.slice(prefix.length) : id;
    }

    /** Whether any registered definition references `def`. */
    isReferenced(def: Definition): boolean {
        this.#referenced ??= Map.groupBy(
            Iterator.from(this.all()).flatMap((def) => def._references()),
            (ref) => this.#stripNamespace(autoIdentifier(ref.target)),
        );
        const refs = this.#referenced.get(def.identifier) ?? [];
        return refs.some((ref) => def instanceof ref.ctor);
    }

    #invalidate(): void {
        this.#referenced = undefined;
        this.#byIdentifier = undefined;
    }

    [INVALIDATE](): void {
        this.#invalidate();
    }

    [CLOSE](): void {
        this.#closed = true;
    }

    [RELEASE](): void {
        this.#unregister(Array.from(this.#members));
    }
}

/** An error caused by adding a definition that another registry holds. */
export class AlreadyRegisteredError extends TypeError {
    constructor(id: string, namespace: string) {
        super(
            `Definition ${id} is already in a ${namespace} registry of another project. Create definitions inside systems, so that each project makes its own`,
        );
        this.name = "AlreadyRegisteredError";
    }
}

/** An error caused by changing a registry after its run ended. */
export class RegistryClosedError extends Error {
    constructor() {
        super(
            "Can't change a registry after its run ended. A system may have kept the registry, or changed it from async work",
        );
        this.name = "RegistryClosedError";
    }
}

/** An error caused by adding a definition that uses the same file as another. */
export class DuplicateIdentifierError extends TypeError {
    constructor(existing: Definition, added: Definition) {
        super(
            `Can't add ${added.constructor.name} ${added.identifier}, ${existing.constructor.name} ${existing.identifier} is already written to ${existing.path} in the ${existing.kind} pack`,
        );
        this.name = "DuplicateIdentifierError";
    }
}

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

/** The pack manifests of a {@link Registry}. */
export interface RegistryManifests {
    /** The behavior pack manifest. */
    readonly bp: Manifest;
    /** The resource pack manifest. */
    readonly rp: Manifest;
}

/**
 * The definitions of one project run.
 *
 * Systems get the registry as their argument. They add definitions with {@link Registry.add}, find
 * them with {@link Registry.resolve} or {@link query}, and remove them with {@link Registry.remove}.
 *
 * Identifiers can include the namespace or not, e.g. `dirt` or `example:dirt`. Both find the same
 * definition.
 *
 * Each run gets a new registry. When the run ends, the registry closes. Reads still work, but
 * `add()` and `remove()` throw {@link RegistryClosedError}.
 */
export class Registry {
    /** The project's namespace, e.g. `example` in `example:dirt`. */
    readonly namespace: string;

    /** The behavior pack and resource pack manifests. */
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
     * Adds definitions, and the definitions that they hold.
     *
     * A definition belongs to one registry at a time. Its identifier gets the namespace, e.g.
     * `example:dirt`. Adding a definition again does nothing. A block and a feature can share an
     * identifier, but two blocks can't.
     *
     * If it throws, the registry stays as it was before the call.
     *
     * @example
     *     const ore = new OreFeature("dirt_ore").add("example:dirt", ["minecraft:stone"]);
     *     reg.add(new ScatterFeature("scatter", { placesFeature: ore }));
     *
     * @throws - {@link AlreadyRegisteredError} if a definition is in another project.
     * @throws - {@link DuplicateIdentifierError} if a definition has the same identifier as another
     *   definition of its kind.
     * @throws - {@link RegistryClosedError} after the run ends.
     */
    add(...defs: Definition[]): this {
        this.#assertOpen();
        const added: Definition[] = [];
        try {
            this.#register(defs, added);
        } catch (error) {
            this.#unregister(added);
            throw error;
        }
        this.#invalidate();
        return this;
    }

    #register(defs: Iterable<Definition>, added: Definition[]): void {
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
            added.push(def);
            this.#register(def._referencedInstances(), added);
        }
    }

    /**
     * Removes definitions.
     *
     * Their identifiers lose the namespace. Definitions that they hold stay in the registry.
     *
     * @throws - {@link RegistryClosedError} after the run ends.
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
     * Iterates over every definition.
     *
     * @yields Each definition, in the order that the registry added them. It skips definitions that
     *   are added or removed during the iteration.
     */
    *all(): Generator<Definition, void, unknown> {
        const snapshot = Array.from(this.#members);
        for (const def of snapshot) {
            if (this.#members.has(def)) yield def;
        }
    }

    /**
     * Finds definitions by class and identifier.
     *
     * A class like `Block` finds at most one definition. A base class like `Definition` can find a
     * block and a feature with the same identifier.
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
     * Whether `ref` points at `target`.
     *
     * A class matches any definition of that class. Other targets match by identifier, with or
     * without the namespace.
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

    /** Whether any definition in the registry references `def`. */
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

/** Thrown by {@link Registry.add} when a definition belongs to another project. */
export class AlreadyRegisteredError extends TypeError {
    constructor(id: string, namespace: string) {
        super(
            `Definition ${id} is already in a ${namespace} registry of another project. Create definitions inside systems, so that each project makes its own`,
        );
        this.name = "AlreadyRegisteredError";
    }
}

/** Thrown when a system changes a registry after its run ended. */
export class RegistryClosedError extends Error {
    constructor() {
        super(
            "Can't change a registry after its run ended. A system may have kept the registry, or changed it from async work",
        );
        this.name = "RegistryClosedError";
    }
}

/** Thrown by {@link Registry.add} when two definitions of one kind have the same identifier. */
export class DuplicateIdentifierError extends TypeError {
    constructor(existing: Definition, added: Definition) {
        super(
            `Can't add ${added.constructor.name} ${added.identifier}, ${existing.constructor.name} ${existing.identifier} is already written to ${existing.path} in the ${existing.kind} pack`,
        );
        this.name = "DuplicateIdentifierError";
    }
}

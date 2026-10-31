import { Entry, type EntryCtor, type Reference } from "#/core/entry";
import type { PackKind, PackOutput } from "#/core/output";
import type { Resource, ResourceCtor } from "#/core/resource";

export const INVALIDATE: unique symbol = Symbol("invalidate");
export const CLOSE: unique symbol = Symbol("close");

/**
 * The pack files of one project run.
 *
 * Systems get the registry as their argument. A registry holds two kinds of files:
 *
 * - Entries, such as blocks and features. Systems add them with {@link Registry.add}, find them with
 *   {@link Registry.resolve} or {@link query}, and remove them with {@link Registry.remove}.
 * - Resources, such as manifests. A registry holds at most one resource of each class.
 *   {@link Registry.resource} creates it the first time that a system asks for it.
 *
 * Each run gets a new registry. When the run ends, the registry closes. Reads still work, but
 * changes throw {@link RegistryClosedError}.
 */
export class Registry {
    /** The project's namespace, e.g. `example` in `example:dirt`. */
    readonly namespace: string;

    #members = new Set<Entry>();
    #resources = new Map<ResourceCtor, Resource>();
    #closed = false;
    #referenced?: Map<string, Reference[]>;
    #byKey?: Map<string, Entry[]>;
    #byPath: Record<PackKind, Map<string, PackOutput>> = {
        behavior: new Map(),
        resource: new Map(),
    };

    constructor(namespace: string) {
        this.namespace = namespace;
    }

    /**
     * Adds entries, and the entries that they reference.
     *
     * Adding an entry again does nothing. Two files in one pack can't have the same path, so a
     * block and a feature can share an identifier, but two blocks can't.
     *
     * If it throws, the registry stays as it was before the call.
     *
     * @example
     *     const ore = new OreFeature("dirt_ore").add("example:dirt", ["minecraft:stone"]);
     *     reg.add(new ScatterFeature("scatter", { placesFeature: ore }));
     *
     * @throws - {@link DuplicatePathError} if an entry has the same path as another file in its
     *   pack.
     * @throws - {@link RegistryClosedError} after the run ends.
     */
    add(...entries: Entry[]): this {
        this.#assertOpen();
        const added: Entry[] = [];
        try {
            this.#register(entries, added);
        } catch (error) {
            this.#unregister(added);
            throw error;
        }
        this.#invalidate();
        return this;
    }

    #register(entries: Iterable<Entry>, added: Entry[]): void {
        for (const entry of entries) {
            if (this.#members.has(entry)) continue;
            const paths = this.#byPath[entry.kind];
            const taken = paths.get(entry.path);
            if (taken !== undefined) throw new DuplicatePathError(taken, entry);
            // Register the entry before its references, so that a reference cycle ends here.
            paths.set(entry.path, entry);
            this.#members.add(entry);
            added.push(entry);
            this.#register(
                entry
                    .references()
                    .map((ref) => ref.target)
                    .filter((target) => target instanceof Entry),
                added,
            );
        }
    }

    /**
     * Removes entries.
     *
     * The entries that they reference stay in the registry.
     *
     * @throws - {@link RegistryClosedError} after the run ends.
     */
    remove(...entries: Entry[]): void {
        this.#assertOpen();
        this.#unregister(entries);
    }

    #unregister(entries: Iterable<Entry>): void {
        for (const entry of entries) {
            if (!this.#members.delete(entry)) continue;
            this.#byPath[entry.kind].delete(entry.path);
        }
        this.#invalidate();
    }

    #assertOpen(): void {
        if (this.#closed) throw new RegistryClosedError();
    }

    /**
     * Iterates over every entry.
     *
     * @yields Each entry, in the order that the registry added them. It skips entries that are
     *   added or removed during the iteration.
     */
    *entries(): Generator<Entry, void, unknown> {
        const snapshot = Array.from(this.#members);
        for (const entry of snapshot) {
            if (this.#members.has(entry)) yield entry;
        }
    }

    /**
     * Finds entries by class and key.
     *
     * The class converts `key` with its `normalizeKey()` first. Thus, for definitions, the key can
     * include the namespace or not, e.g. `dirt` or `example:dirt`.
     *
     * A class like `Block` finds at most one entry. A base class like `Definition` can find a block
     * and a feature with the same identifier.
     *
     * @example
     *     reg.resolve(Block, "dirt"); // [dirt]
     *     reg.resolve(Block, "example:dirt"); // Same block.
     */
    resolve<T extends Entry>(ctor: EntryCtor<T>, key: string): T[] {
        this.#byKey ??= Map.groupBy(this.#members, (entry) => entry.key());
        const entries = this.#byKey.get(ctor.normalizeKey(key, this.namespace)) ?? [];
        return entries.filter((entry): entry is T => entry instanceof ctor);
    }

    /**
     * Whether `ref` points at `target`.
     *
     * A class matches any entry of that class. Other targets match by key.
     */
    matches(ref: Reference, target: EntryCtor | Entry | string): boolean {
        const key = this.#keyOf(ref);
        if (typeof target === "function") {
            return this.resolve(ref.ctor, key).some((entry) => entry instanceof target);
        }
        if (target instanceof Entry) return target instanceof ref.ctor && target.key() === key;
        return ref.ctor.normalizeKey(target, this.namespace) === key;
    }

    /** Whether any entry in the registry references `entry`. */
    isReferenced(entry: Entry): boolean {
        this.#referenced ??= Map.groupBy(
            Iterator.from(this.entries()).flatMap((referrer) => referrer.references()),
            (ref) => this.#keyOf(ref),
        );
        const refs = this.#referenced.get(entry.key()) ?? [];
        return refs.some((ref) => entry instanceof ref.ctor);
    }

    #keyOf(ref: Reference): string {
        const { ctor, target } = ref;
        return typeof target === "string"
            ? ctor.normalizeKey(target, this.namespace)
            : target.key();
    }

    /**
     * Returns the resource of class `ctor`.
     *
     * The first call for a class creates the resource with `new ctor()`. Later calls return the
     * same resource.
     *
     * @example
     *     reg.resource(BehaviorManifest).authors("Steve");
     *
     * @throws - {@link DuplicatePathError} if the new resource has the same path as another file in
     *   its pack.
     * @throws - {@link RegistryClosedError} if the run ended and the resource doesn't exist.
     */
    resource<T extends Resource>(ctor: ResourceCtor<T>): T {
        let resource = this.#resources.get(ctor);
        if (resource === undefined) {
            this.#assertOpen();
            resource = new ctor();
            const paths = this.#byPath[resource.kind];
            const taken = paths.get(resource.path);
            if (taken !== undefined) throw new DuplicatePathError(taken, resource);
            paths.set(resource.path, resource);
            this.#resources.set(ctor, resource);
        }
        return resource as T;
    }

    /**
     * Iterates over every file that the registry holds.
     *
     * @yields Each resource that isn't empty, in the order that the registry created them. Then
     *   each entry, in the order of {@link Registry.entries}.
     */
    *outputs(): Generator<PackOutput, void, unknown> {
        for (const resource of this.#resources.values()) {
            if (!resource.isEmpty()) yield resource;
        }
        yield* this.entries();
    }

    #invalidate(): void {
        this.#referenced = undefined;
        this.#byKey = undefined;
    }

    [INVALIDATE](): void {
        this.#invalidate();
    }

    [CLOSE](): void {
        this.#closed = true;
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

/**
 * Thrown by {@link Registry.add} and {@link Registry.resource} when two files in one pack have the
 * same path.
 */
export class DuplicatePathError extends TypeError {
    constructor(existing: PackOutput, added: PackOutput) {
        super(
            `Can't add ${describe(added)}, ${describe(existing)} is already written to ${existing.path} in the ${existing.kind} pack`,
        );
        this.name = "DuplicatePathError";
    }
}

function describe(output: PackOutput): string {
    const name = output.constructor.name;
    return output instanceof Entry ? `${name} ${output.key()}` : name;
}

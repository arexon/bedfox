import type { Detail, Diagnostic } from "#/diagnostic";
import { Entry, type EntryCtor, type Reference } from "#/entry";
import type { PackFile, PackKind, PackOutput } from "#/output";
import { pluginPath } from "#/plugin";
import { Resource, type ResourceCtor } from "#/resource";
import type { ScheduledSystem } from "#/system";

export const ENTER: unique symbol = Symbol("enter");
export const CLASHES: unique symbol = Symbol("clashes");
export const FREEZE: unique symbol = Symbol("freeze");

/**
 * The pack files of one project run.
 *
 * Systems get the registry as their argument. A registry holds two kinds of files:
 *
 * - Entries, such as blocks and features. Systems add them with {@link Registry.add}, find them with
 *   {@link Registry.resolve} or `query()`, and remove them with {@link Registry.remove}.
 * - Resources, such as manifests. A registry holds at most one resource of each class.
 *   {@link Registry.resource} creates it the first time that a system asks for it.
 *
 * Each run gets a new registry. When the run ends, the registry freezes. Reads still work, but
 * changes throw {@link RegistryFrozenError}.
 */
export class Registry {
    /** The project's namespace, e.g. `example` in `example:dirt`. */
    readonly namespace: string;

    #members = new Set<Entry>();
    #resources = new Map<ResourceCtor, Resource>();
    #frozen = false;
    #referenced?: Map<string, Reference[]>;
    #byKey?: Map<string, Entry[]>;
    #addedBy = new Map<PackOutput, ScheduledSystem>();
    #system?: ScheduledSystem;
    readonly #diagnostics: Diagnostic[];

    constructor(namespace: string, diagnostics: Diagnostic[]) {
        this.namespace = namespace;
        this.#diagnostics = diagnostics;
    }

    /**
     * Adds entries, and the entries that they reference.
     *
     * Adding an entry again does nothing. Two files in one pack can't have the same path, so a
     * block and a feature can share an identifier, but two blocks can't. The run fails with
     * {@link DuplicatePath} if two files have the same path when it ends.
     *
     * @example
     *     const ore = new OreFeature("dirt_ore").add("example:dirt", ["minecraft:stone"]);
     *     reg.add(new ScatterFeature("scatter", { placesFeature: ore }));
     *
     * @throws - {@link RegistryFrozenError} after the run ends.
     */
    add(...entries: Entry[]): this {
        this.#assertNotFrozen();
        this.#register(entries);
        this.#invalidate();
        return this;
    }

    #register(entries: Iterable<Entry>): void {
        for (const entry of entries) {
            if (this.#members.has(entry)) continue;
            // Register the entry before its references, so that a reference cycle ends here.
            this.#members.add(entry);
            this.#track(entry);
            this.#register(
                entry
                    .references()
                    .map((ref) => ref.target)
                    .filter((target) => target instanceof Entry),
            );
        }
    }

    #track(output: PackOutput): void {
        // The run enters each system before the system gets the registry.
        this.#addedBy.set(output, this.#system as ScheduledSystem);
    }

    /**
     * Removes entries.
     *
     * The entries that they reference stay in the registry.
     *
     * @throws - {@link RegistryFrozenError} after the run ends.
     */
    remove(...entries: Entry[]): void {
        this.#assertNotFrozen();
        this.#unregister(entries);
    }

    #unregister(entries: Iterable<Entry>): void {
        for (const entry of entries) {
            if (!this.#members.delete(entry)) continue;
            this.#addedBy.delete(entry);
        }
        this.#invalidate();
    }

    #assertNotFrozen(): void {
        if (this.#frozen) throw new RegistryFrozenError();
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
     * At the end of a run without errors, a class like `Block` finds at most one entry. A base
     * class like `Definition` can find a block and a feature with the same identifier.
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
     *     reg.resource(BehaviorManifest).addAuthor("Steve");
     *
     * @throws - {@link RegistryFrozenError} if the run ended and the resource doesn't exist.
     */
    resource<T extends Resource>(ctor: ResourceCtor<T>): T {
        let resource = this.#resources.get(ctor);
        if (resource === undefined) {
            this.#assertNotFrozen();
            resource = new ctor();
            this.#resources.set(ctor, resource);
            this.#track(resource);
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

    /**
     * Reports problems that a system found.
     *
     * A diagnostic with the `error` severity makes the run fail after the last system. A warning
     * doesn't, and the returned {@link FrozenRegistry} holds it in
     * {@link FrozenRegistry.warnings}.
     *
     * @example
     *     project.addSystem("finalize", (reg) => {
     *         if (!reg.entries().next().done) return;
     *         reg.report({
     *             severity: "warning",
     *             code: "NoEntries",
     *             title: "The run added no entries",
     *         });
     *     });
     *
     * @throws - {@link RegistryFrozenError} after the run ends.
     */
    report(...diagnostics: Diagnostic[]): void {
        this.#assertNotFrozen();
        this.#diagnostics.push(...diagnostics);
    }

    #invalidate(): void {
        this.#referenced = undefined;
        this.#byKey = undefined;
    }

    [ENTER](system: ScheduledSystem): void {
        this.#system = system;
        this.#invalidate();
    }

    [CLASHES](): DuplicatePath[] {
        // An empty resource isn't written, so it can't clash.
        const written = this.#addedBy
            .entries()
            .filter(([output]) => !(output instanceof Resource && output.isEmpty()))
            .map(([output, addedBy]) => ({ output, addedBy }));
        const clashes: DuplicatePath[] = [];
        for (const [kind, files] of Map.groupBy(written, ({ output }) => output.kind)) {
            for (const [path, outputs] of Map.groupBy(files, ({ output }) => output.path)) {
                if (outputs.length > 1) clashes.push(new DuplicatePath(kind, path, outputs));
            }
        }
        return clashes;
    }

    [FREEZE](): void {
        this.#frozen = true;
    }
}

/**
 * The registry of a run that ended without an error. {@link Project.run} returns it.
 *
 * It reads the registry, but can't change it. {@link FrozenRegistry.emit} generates the pack files.
 */
export class FrozenRegistry {
    /** The warnings of the run, in the order they came. */
    readonly warnings: readonly Diagnostic[];
    readonly #reg: Registry;

    constructor(reg: Registry, warnings: readonly Diagnostic[]) {
        this.#reg = reg;
        this.warnings = warnings;
    }

    /** The project's namespace, e.g. `example` in `example:dirt`. */
    get namespace(): string {
        return this.#reg.namespace;
    }

    /** Iterates over every entry. See {@link Registry.entries}. */
    entries(): Generator<Entry, void, unknown> {
        return this.#reg.entries();
    }

    /** Finds entries by class and key. See {@link Registry.resolve}. */
    resolve<T extends Entry>(ctor: EntryCtor<T>, key: string): T[] {
        return this.#reg.resolve(ctor, key);
    }

    /** Whether `ref` points at `target`. See {@link Registry.matches}. */
    matches(ref: Reference, target: EntryCtor | Entry | string): boolean {
        return this.#reg.matches(ref, target);
    }

    /** Whether any entry in the registry references `entry`. */
    isReferenced(entry: Entry): boolean {
        return this.#reg.isReferenced(entry);
    }

    /**
     * Returns the resource of class `ctor` that the run created.
     *
     * @throws - {@link RegistryFrozenError} if the run didn't create a resource of class `ctor`.
     */
    resource<T extends Resource>(ctor: ResourceCtor<T>): T {
        return this.#reg.resource(ctor);
    }

    /** Iterates over every file that the registry holds. See {@link Registry.outputs}. */
    outputs(): Generator<PackOutput, void, unknown> {
        return this.#reg.outputs();
    }

    /**
     * Generates the pack files.
     *
     * Each file has the kind of pack, the path, and the contents that the output's `emit()`
     * generates with the project's namespace. The files come in the order of
     * {@link Registry.outputs}.
     *
     * @example
     *     const reg = await project.run();
     *     for (const file of reg.emit()) {
     *         console.log(file.kind, file.path);
     *     }
     */
    emit(): PackFile[] {
        const ctx = { namespace: this.namespace };
        return Array.from(this.outputs(), (output) => ({
            kind: output.kind,
            path: output.path,
            ...output.emit(ctx),
        }));
    }
}

/** Thrown when a system changes a registry after its run ended. */
export class RegistryFrozenError extends Error {
    constructor() {
        super(
            "Can't change a registry after its run ended. A system may have kept the registry, or changed it from async work",
        );
        this.name = "RegistryFrozenError";
    }
}

/**
 * Reported by {@link Project.run} when two files in one pack have the same path at the end of the
 * run.
 *
 * A system can check for an entry with {@link Registry.resolve} before it adds one.
 */
export class DuplicatePath implements Diagnostic {
    readonly severity = "error";
    readonly code = DuplicatePath.name;
    readonly title: string;
    readonly details: readonly Detail[];
    /** The kind of pack that holds the files. */
    readonly kind: PackKind;
    /** The path of the files from the pack's root. */
    readonly path: string;
    /** The files with the path, each with the system that added it. */
    readonly outputs: readonly { readonly output: PackOutput; readonly addedBy: ScheduledSystem }[];

    constructor(
        kind: PackKind,
        path: string,
        outputs: readonly { readonly output: PackOutput; readonly addedBy: ScheduledSystem }[],
    ) {
        this.title = `${outputs.length} files have the path ${path} in the ${kind} pack`;
        this.details = outputs.map(({ output, addedBy }) => ({
            kind: "field",
            label: DuplicatePath.#describe(output),
            value: `added by ${DuplicatePath.#describeSystem(addedBy)}`,
        }));
        this.kind = kind;
        this.path = path;
        this.outputs = outputs;
    }

    static #describeSystem(system: ScheduledSystem): string {
        const from = system.plugins.length === 0 ? "" : ` from ${pluginPath(system.plugins)}`;
        return `${system.label} on ${system.schedule}${from}`;
    }

    static #describe(output: PackOutput): string {
        const name = output.constructor.name;
        return output instanceof Entry ? `${name} ${output.key()}` : name;
    }
}

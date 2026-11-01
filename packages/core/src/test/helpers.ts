import type { Entry } from "#/entry";
import type { PackOutput } from "#/output";
import { Project } from "#/project";
import type { Registry } from "#/registry";
import { type PreparedSystem, type System, SystemFailedError } from "#/system";

export const NS = "test";

export function json(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
}

export function ids(entries: Iterable<Entry>): string[] {
    return Array.from(entries, (entry) => entry.key());
}

export function emitted(output: PackOutput, namespace = NS): unknown {
    const contents = output.emit({ namespace });
    return contents.format === "json" ? json(contents.value) : contents.value;
}

export async function runSetup(
    namespace: string,
    ...systems: (System | PreparedSystem<unknown>)[]
): Promise<Registry> {
    const registry = Promise.withResolvers<Registry>();
    const project = new Project(namespace).addSystem("setup", registry.resolve, ...systems);
    try {
        await project.run();
    } catch (error) {
        throw error instanceof SystemFailedError ? error.cause : error;
    }
    return registry.promise;
}

export function registryWith(...entries: Entry[]): Promise<Registry> {
    return runSetup(NS, (reg) => {
        reg.add(...entries);
    });
}

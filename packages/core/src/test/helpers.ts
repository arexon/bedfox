import { expect } from "vite-plus/test";

import { type Diagnostic, RunFailedError } from "#/diagnostic";
import type { Entry } from "#/entry";
import type { PackOutput } from "#/output";
import { Project } from "#/project";
import type { Registry } from "#/registry";
import type { System, SystemConfig } from "#/system";

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
    ...systems: (System | SystemConfig)[]
): Promise<Registry> {
    const registry = Promise.withResolvers<Registry>();
    const project = new Project(namespace).addSystem("setup", registry.resolve, ...systems);
    try {
        await project.run();
    } catch (error) {
        const diagnostics = error instanceof RunFailedError ? error.diagnostics : [];
        const failed = diagnostics.find((diagnostic) => diagnostic.code === "SystemFailed");
        throw failed === undefined ? error : failed.cause;
    }
    return registry.promise;
}

export function registryWith(...entries: Entry[]): Promise<Registry> {
    return runSetup(NS, (reg) => {
        reg.add(...entries);
    });
}

export async function diagnosticsOf(run: Promise<unknown>): Promise<readonly Diagnostic[]> {
    const error = await run.then(
        () => null,
        (error: unknown) => error,
    );
    expect(error).toBeInstanceOf(RunFailedError);
    return (error as RunFailedError).diagnostics;
}

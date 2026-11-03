import {
    type Entry,
    type PackOutput,
    Project,
    type Registry,
    RunFailedError,
    type System,
    type SystemConfig,
} from "@bedfox/core";
import corePkg from "@bedfox/core/package.json" with { type: "json" };

import pkg from "#package.json" with { type: "json" };

export const NS = "test";

export const GENERATED_WITH = {
    [corePkg.name]: [corePkg.version],
    [pkg.name]: [pkg.version],
};

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

interface ManifestOverrides {
    header?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

export function expectedManifest({ header, metadata, ...rest }: ManifestOverrides = {}): unknown {
    return {
        format_version: 3,
        header: {
            name: "test BP",
            uuid: "bcd6188d-467b-56e7-a79d-1cfd2dca7dc2",
            version: "1.0.0",
            min_engine_version: "1.26.50",
            ...header,
        },
        modules: [
            {
                type: "data",
                uuid: "820c330d-fc15-5a5c-a3d6-a84a35ccd916",
                version: "1.0.0",
            },
        ],
        ...(metadata === undefined ? {} : { metadata }),
        ...rest,
    };
}

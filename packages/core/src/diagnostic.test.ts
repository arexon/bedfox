import { describe, expect, test } from "vite-plus/test";

import { type Diagnostic, RunFailedError } from "#/diagnostic";
import { DuplicatePlugin, type Plugin, PluginFailed } from "#/plugin";
import { DuplicatePath } from "#/registry";
import { type Schedule, SystemOrderCycle } from "#/schedule";
import {
    type PreparedSystem,
    prepared,
    type System,
    SystemFailed,
    ScheduledSystem,
} from "#/system";
import { Clash, Leaf, remark } from "#/test/fixtures";

class BlockPlugin implements Plugin {
    build(): void {}
}

class DefaultPlugins implements Plugin {
    build(): void {}
}

function addDirt(): void {}

function important(): void {}

function two(): void {}

function scheduled(
    system: System | PreparedSystem<unknown>,
    schedule: Schedule,
    index: number,
    plugins: Plugin[] = [],
): ScheduledSystem {
    return new ScheduledSystem(system, schedule, index, plugins);
}

function titleOf(system: System | PreparedSystem<unknown>): string {
    return new SystemFailed(scheduled(system, "transform", 0), "run", "boom").title;
}

describe("diagnostic text", () => {
    test("names a failed system, its schedule and the plugins that added it", () => {
        const system = scheduled(addDirt, "setup", 0, [new DefaultPlugins(), new BlockPlugin()]);
        const failed = new SystemFailed(system, "run", "boom");
        expect(failed).toMatchObject({
            severity: "error",
            code: "SystemFailed",
            title: "System addDirt failed in run",
            details: [
                { kind: "field", label: "schedule", value: "setup (#0)" },
                { kind: "field", label: "added by", value: "DefaultPlugins > BlockPlugin" },
            ],
            cause: "boom",
        });
        expect(failed.help).toBeUndefined();
    });

    test("names a system without a name by its index, and tells how to name it", () => {
        const system = scheduled(() => {}, "finalize", 2);
        expect(new SystemFailed(system, "prepare", "offline")).toMatchObject({
            title: "System #2 failed in prepare",
            details: [{ kind: "field", label: "schedule", value: "finalize (#2)" }],
            help: "Use a named function to show the name of the system here",
        });
    });

    test("names a prepared system after its run function, unless it is named run", () => {
        const named = prepared(
            async () => [],
            function addBiomes() {},
        );
        const unnamed = prepared(async () => [], { run: () => {} }.run);
        expect(titleOf(named)).toBe("System addBiomes failed in run");
        expect(titleOf(unnamed)).toBe("System #0 failed in run");
    });

    test("names a failed plugin and the plugins that added it", () => {
        const cause = new Error("offline");
        const plugins = [new DefaultPlugins(), new BlockPlugin()];
        expect(new PluginFailed(plugins, cause)).toMatchObject({
            title: "Plugin BlockPlugin failed in build()",
            details: [{ kind: "field", label: "added by", value: "DefaultPlugins" }],
            cause,
        });
    });

    test("names the plugins that added each copy of a duplicate plugin", () => {
        const plugin = new DuplicatePlugin(
            [new DefaultPlugins(), new BlockPlugin()],
            [new BlockPlugin()],
        );
        expect(plugin).toMatchObject({
            title: "Plugin BlockPlugin is added twice",
            details: [
                { kind: "field", label: "first added by", value: "DefaultPlugins" },
                { kind: "field", label: "again added by", value: "the project" },
            ],
            help: "A project holds one plugin of each class",
        });
    });

    test("describes an order cycle as a chain, with the rule of each step", () => {
        const cycle = new SystemOrderCycle("setup", [
            { system: scheduled(two, "setup", 1), rule: "afterAll" },
            { system: scheduled(important, "setup", 0), rule: "before" },
        ]);
        expect(cycle).toMatchObject({
            title: "Systems on setup form an order cycle",
            details: [
                {
                    kind: "chain",
                    steps: [
                        { text: "two (#1)" },
                        { text: "important (#0)", note: "important (#0) uses afterAll()" },
                        { text: "two (#1)", note: "important (#0) uses before(two (#1))" },
                    ],
                },
            ],
        });
        expect(cycle.help).toBeUndefined();
    });

    test("names each file of a path clash and the system that added it", () => {
        const clash = new DuplicatePath("behavior", "custom/clash.json", [
            { output: new Clash(), addedBy: scheduled(addDirt, "setup", 0) },
            {
                output: new Leaf("clash"),
                addedBy: scheduled(() => {}, "transform", 3, [new BlockPlugin()]),
            },
        ]);
        expect(clash).toMatchObject({
            title: "2 files have the path custom/clash.json in the behavior pack",
            details: [
                { kind: "field", label: "Clash", value: "added by addDirt (#0) on setup" },
                {
                    kind: "field",
                    label: "Leaf clash",
                    value: "added by system #3 on transform from BlockPlugin",
                },
            ],
        });
    });
});

describe(RunFailedError.name, () => {
    test("holds the diagnostics, and has a line for each in its message", () => {
        const diagnostics: Diagnostic[] = [
            new PluginFailed([new BlockPlugin()], "offline"),
            remark("warning", "careful"),
            { severity: "warning", title: "No code" },
        ];
        const error = new RunFailedError(diagnostics);
        expect(error.diagnostics).toBe(diagnostics);
        expect(error.message).toBe(
            [
                "The run failed:",
                "  error[PluginFailed]: Plugin BlockPlugin failed in build(): offline",
                "  warning[Remark]: careful",
                "  warning: No code",
            ].join("\n"),
        );
    });

    test("shows the message of each cause, and holds the causes of the errors", () => {
        const system = scheduled(addDirt, "setup", 0);
        const missing = new Error("dirt.json is missing");
        const error = new RunFailedError([
            { severity: "warning", title: "careful", cause: "ignored" },
            new SystemFailed(system, "prepare", missing),
            new SystemFailed(system, "prepare", "timeout"),
        ]);
        expect(error.message.split("\n").slice(2)).toStrictEqual([
            "  error[SystemFailed]: System addDirt failed in prepare: dirt.json is missing",
            "  error[SystemFailed]: System addDirt failed in prepare: timeout",
        ]);
        expect(error.errors).toStrictEqual([missing, "timeout"]);
    });
});

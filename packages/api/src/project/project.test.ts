import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, test } from "vite-plus/test";

import { Block } from "#/block/index";
import type { Definition } from "#/core/definition";
import {
    prepared,
    Project,
    type Registry,
    RegistryClosedError,
    SystemFailedError,
} from "#/project/index";

const NS = "test";

const OPTIONS = { namespace: NS } as const;

function ids(defs: Iterable<Definition>): string[] {
    return Array.from(defs, (def) => def.identifier);
}

function langPlugin(): void {}

function defaultPlugins(project: Project): void {
    project.addPlugin(langPlugin);
}

function loop(project: Project): void {
    project.addPlugin(loop);
}

describe(Project.name, () => {
    describe("run()", () => {
        test("runs setup, transform, then finalize, each in insertion order", async () => {
            const order: string[] = [];
            const push = (name: string) => () => order.push(name);
            const schedules = ["finalize", "transform", "setup"] as const;
            const project = new Project(OPTIONS);
            for (const schedule of schedules) {
                project.addSystem(schedule, push(`${schedule} 1`), push(`${schedule} 2`));
            }
            await project.run();
            expect(order).toStrictEqual([
                "setup 1",
                "setup 2",
                "transform 1",
                "transform 2",
                "finalize 1",
                "finalize 2",
            ]);
        });

        test("defaults to transform", async () => {
            const order: string[] = [];
            await new Project(OPTIONS)
                .addSystem("finalize", () => order.push("finalize"))
                .addSystem(() => order.push("default"))
                .addSystem("setup", () => order.push("setup"))
                .run();
            expect(order).toStrictEqual(["setup", "default", "finalize"]);
        });

        test("lets systems see definitions added by earlier systems", async () => {
            let found: Block[] = [];
            await new Project(OPTIONS)
                .addSystem("setup", (reg) => reg.add(new Block("dirt")))
                .addSystem((reg) => (found = reg.resolve(Block, "dirt")))
                .run();
            expect(ids(found)).toStrictEqual(["dirt"]);
        });

        test("uses a new registry on every run", async () => {
            const regs: Registry[] = [];
            const project = new Project(OPTIONS).addSystem((reg) => regs.push(reg));
            await project.run();
            await project.run();
            expect(regs.length).toBe(2);
            expect(regs[0]).not.toBe(regs[1]);
        });

        test("releases the definitions of the last run", async () => {
            const dirt = new Block("dirt");
            const regs: Registry[] = [];
            const project = new Project(OPTIONS).addSystem("setup", (reg) => {
                regs.push(reg);
                reg.add(dirt);
            });
            await project.run();
            await project.run();
            expect([...regs[0].all()]).toStrictEqual([]);
            expect([...regs[1].all()]).toStrictEqual([dirt]);
            expect(dirt.qualifiedIdentifier).toBe(`${NS}:dirt`);
        });

        test("rejects a run while another run is active", async () => {
            const project = new Project(OPTIONS).addSystem(
                prepared(
                    () => delay(1),
                    () => {},
                ),
            );
            const first = project.run();
            await expect(project.run()).rejects.toThrow(
                expect.objectContaining({
                    name: "RunInProgressError",
                    message: "Can't start a run while another run of this project is active",
                }),
            );
            await first;
            await expect(project.run()).resolves.toBeUndefined();
        });

        test("can run again after a failed run", async () => {
            let fail = true;
            const project = new Project(OPTIONS).addSystem(() => {
                if (fail) throw new Error("boom");
            });
            await expect(project.run()).rejects.toThrow(SystemFailedError);
            fail = false;
            await expect(project.run()).resolves.toBeUndefined();
        });

        test("closes the registry after a failed run", async () => {
            let kept: Registry;
            const project = new Project(OPTIONS).addSystem(
                (reg) => (kept = reg),
                () => {
                    throw new Error("boom");
                },
            );
            await expect(project.run()).rejects.toThrow(SystemFailedError);
            expect(() => kept.add(new Block("dirt"))).toThrow(RegistryClosedError);
        });
    });

    describe("addSystem()", () => {
        test("rejects systems while the project runs", async () => {
            const project = new Project(OPTIONS);
            project.addSystem("setup", () => project.addSystem(() => {}));
            await expect(project.run()).rejects.toThrow(
                expect.objectContaining({
                    name: "SystemFailedError",
                    message: "System 0 on setup failed in run",
                    cause: expect.objectContaining({
                        name: "SystemAddedDuringRunError",
                        message: "Can't add systems while the project runs. Add them before run()",
                    }),
                }),
            );
        });

        test("rejects async functions, and adds none of the systems", async () => {
            const order: string[] = [];
            const project = new Project(OPTIONS).addSystem("setup", () => order.push("before"));
            expect(() =>
                project.addSystem(
                    "setup",
                    () => order.push("rejected"),
                    async function addDirt() {},
                ),
            ).toThrow(
                expect.objectContaining({
                    name: "AsyncSystemError",
                    message: expect.stringContaining("System 2 (addDirt) on setup is async."),
                }),
            );
            await project.run();
            expect(order).toStrictEqual(["before"]);
        });

        test("rejects prepared systems with an async run function", () => {
            expect(() =>
                new Project(OPTIONS).addSystem(
                    prepared(
                        async () => 1,
                        async () => {},
                    ),
                ),
            ).toThrow(
                expect.objectContaining({
                    name: "AsyncSystemError",
                    message: expect.stringContaining("System 0 on transform is async."),
                }),
            );
        });
    });

    describe("addPlugin()", () => {
        test("calls the plugin at once with the project", () => {
            const seen: Project[] = [];
            const project = new Project(OPTIONS).addPlugin((p) => seen.push(p));
            expect(seen).toHaveLength(1);
            expect(seen[0]).toBe(project);
        });

        test("runs a plugin's systems where it was added, also for nested plugins", async () => {
            const order: string[] = [];
            const push = (name: string) => () => order.push(name);
            const inner = (project: Project) => project.addSystem(push("inner"));
            const outer = (project: Project) =>
                project.addSystem(push("outer 1")).addPlugin(inner).addSystem(push("outer 2"));
            await new Project(OPTIONS)
                .addSystem(push("before"))
                .addPlugin(outer)
                .addSystem(push("after"))
                .run();
            expect(order).toStrictEqual(["before", "outer 1", "inner", "outer 2", "after"]);
        });

        test("rejects a plugin added twice, and names the plugin that added it first", () => {
            const project = new Project(OPTIONS).addPlugin(defaultPlugins);
            expect(() => project.addPlugin(langPlugin)).toThrow(
                expect.objectContaining({
                    name: "DuplicatePluginError",
                    message: "Plugin langPlugin is already added by defaultPlugins",
                }),
            );
            expect(() => project.addPlugin(defaultPlugins)).toThrow(
                expect.objectContaining({
                    name: "DuplicatePluginError",
                    message: "Plugin defaultPlugins is already added",
                }),
            );
        });

        test("rejects a plugin that adds itself", () => {
            expect(() => new Project(OPTIONS).addPlugin(loop)).toThrow(
                expect.objectContaining({
                    name: "DuplicatePluginError",
                    message: "Plugin loop is already added",
                }),
            );
        });

        test("rejects plugins while the project runs", async () => {
            const project = new Project(OPTIONS);
            project.addSystem("setup", () => project.addPlugin(() => {}));
            await expect(project.run()).rejects.toThrow(
                expect.objectContaining({
                    name: "SystemFailedError",
                    cause: expect.objectContaining({ name: "SystemAddedDuringRunError" }),
                }),
            );
        });

        test("rejects async functions without calling them", () => {
            let called = false;
            expect(() =>
                new Project(OPTIONS).addPlugin(async function dirtPlugin() {
                    called = true;
                }),
            ).toThrow(
                expect.objectContaining({
                    name: "AsyncPluginError",
                    message: expect.stringContaining("Plugin dirtPlugin is async."),
                }),
            );
            expect(called).toBe(false);
        });

        test("doesn't name a failed plugin for systems added after it", async () => {
            const cause = new Error("boom");
            const project = new Project(OPTIONS);
            expect(() =>
                project.addPlugin(function broken() {
                    throw new Error("broken");
                }),
            ).toThrow("broken");
            project.addSystem("setup", function addDirt() {
                throw cause;
            });
            await expect(project.run()).rejects.toThrow(
                expect.objectContaining({ message: "System 0 (addDirt) on setup failed in run" }),
            );
        });
    });

    describe("errors", () => {
        test("wrap what a system throws, with its schedule, index and name", async () => {
            const cause = new Error("boom");
            const addDirt = () => {
                throw cause;
            };
            await expect(
                new Project(OPTIONS).addSystem("setup", () => {}, addDirt).run(),
            ).rejects.toThrow(
                expect.objectContaining({
                    name: "SystemFailedError",
                    message: "System 1 (addDirt) on setup failed in run",
                    cause,
                }),
            );
        });

        test("name the plugins that added a system, from the innermost", async () => {
            const cause = new Error("boom");
            function blockPlugin(project: Project): void {
                project.addSystem("setup", function addDirt() {
                    throw cause;
                });
            }
            function defaultPlugins(project: Project): void {
                project.addPlugin(blockPlugin);
            }
            await expect(new Project(OPTIONS).addPlugin(defaultPlugins).run()).rejects.toThrow(
                expect.objectContaining({
                    name: "SystemFailedError",
                    message:
                        "System 0 (addDirt) on setup from plugin blockPlugin in defaultPlugins failed in run",
                    cause,
                }),
            );
        });

        test("name the plugin of an async system, also an anonymous one", () => {
            expect(() =>
                new Project(OPTIONS).addPlugin((project) => {
                    project.addSystem(async function addDirt() {});
                }),
            ).toThrow(
                expect.objectContaining({
                    name: "AsyncSystemError",
                    message: expect.stringContaining(
                        "System 0 (addDirt) on transform from plugin (anonymous) is async.",
                    ),
                }),
            );
        });
    });
});

describe(prepared.name, () => {
    test("passes each prepared value to its own system", async () => {
        const seen: string[] = [];
        await new Project(OPTIONS)
            .addSystem(
                "setup",
                prepared(
                    async () => {
                        await delay(5);
                        return "slow";
                    },
                    (_, data) => seen.push(data),
                ),
                prepared(
                    async () => "fast",
                    (_, data) => seen.push(data),
                ),
            )
            .run();
        expect(seen).toStrictEqual(["slow", "fast"]);
    });

    test("prepares before any system runs", async () => {
        const order: string[] = [];
        await new Project(OPTIONS)
            .addSystem("setup", () => order.push("system"))
            .addSystem(
                "finalize",
                prepared(
                    async () => {
                        order.push("prepare");
                    },
                    () => order.push("run"),
                ),
            )
            .run();
        expect(order).toStrictEqual(["prepare", "system", "run"]);
    });

    test("starts every prepare step at once", async () => {
        const gate = Promise.withResolvers<void>();
        // The first step waits for the second, so the run would never end if they ran in turn.
        await new Project(OPTIONS)
            .addSystem(
                prepared(
                    () => gate.promise,
                    () => {},
                ),
                prepared(
                    async () => gate.resolve(),
                    () => {},
                ),
            )
            .run();
    });

    test("runs no system if a prepare step rejects", async () => {
        const cause = new Error("offline");
        let ran = false;
        const project = new Project(OPTIONS)
            .addSystem("setup", () => (ran = true))
            .addSystem(
                "finalize",
                prepared(
                    () => Promise.reject(cause),
                    () => {},
                ),
            );
        await expect(project.run()).rejects.toThrow(
            expect.objectContaining({
                name: "SystemFailedError",
                message: "System 0 on finalize failed in prepare",
                cause,
            }),
        );
        expect(ran).toBe(false);
    });

    test("rejects only after every prepare step ends", async () => {
        let finished = false;
        const project = new Project(OPTIONS).addSystem(
            prepared(
                () => Promise.reject(new Error("offline")),
                () => {},
            ),
            prepared(
                async () => {
                    await delay(5);
                    finished = true;
                },
                () => {},
            ),
        );
        await expect(project.run()).rejects.toThrow(SystemFailedError);
        expect(finished).toBe(true);
    });

    test("reports the first rejected prepare step in system order", async () => {
        const first = new Error("first");
        await expect(
            new Project(OPTIONS)
                .addSystem(
                    prepared(
                        async () => {
                            await delay(5);
                            throw first;
                        },
                        () => {},
                    ),
                    prepared(
                        () => Promise.reject(new Error("second")),
                        () => {},
                    ),
                )
                .run(),
        ).rejects.toThrow(
            expect.objectContaining({
                message: "System 0 on transform failed in prepare",
                cause: first,
            }),
        );
    });

    test("names the system after its run function", async () => {
        const cause = new Error("boom");
        const addBiomes = () => {
            throw cause;
        };
        await expect(
            new Project(OPTIONS).addSystem(prepared(async () => [], addBiomes)).run(),
        ).rejects.toThrow(
            expect.objectContaining({ message: "System 0 (addBiomes) on transform failed in run" }),
        );
    });
});

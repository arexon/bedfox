import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, test } from "vite-plus/test";

import { Block } from "#/block/index";
import type { Definition } from "#/core/index";
import { AsyncSystemError, prepared, Project, SystemFailedError } from "#/project/index";
import { type Registry, RegistryClosedError } from "#/registry/index";

const NS = "test";

const OPTIONS = { namespace: NS } as const;

const ASYNC_ADVICE =
    "Systems must be sync, so move async work into the prepare step of a prepared system";

function ids(defs: Iterable<Definition>): string[] {
    return Array.from(defs, (def) => def.identifier);
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
                prepared({ prepare: () => delay(1), run: () => {} }),
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
                    message: `System 2 (addDirt) on setup is async. ${ASYNC_ADVICE}`,
                }),
            );
            await project.run();
            expect(order).toStrictEqual(["before"]);
        });

        test("rejects prepared systems with an async run function", () => {
            expect(() =>
                new Project(OPTIONS).addSystem(
                    prepared({ prepare: async () => 1, run: async () => {} }),
                ),
            ).toThrow(
                expect.objectContaining({
                    name: "AsyncSystemError",
                    message: `System 0 on transform is async. ${ASYNC_ADVICE}`,
                }),
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

        test("reject systems that return a promise", async () => {
            await expect(
                new Project(OPTIONS).addSystem(() => Promise.resolve()).run(),
            ).rejects.toThrow(
                expect.objectContaining({
                    name: "AsyncSystemError",
                    message: `System 0 on transform returned a promise. ${ASYNC_ADVICE}`,
                }),
            );
        });

        test("let thenables that aren't promises through, without calling their then", async () => {
            let calls = 0;
            // oxlint-disable-next-line unicorn/no-thenable -- the test needs a thenable
            const thenable = { then: () => calls++ };
            await expect(
                new Project(OPTIONS).addSystem(() => thenable).run(),
            ).resolves.toBeUndefined();
            expect(calls).toBe(0);
        });

        test("stop an async system from changing the registry after the run", async () => {
            const late: Promise<unknown>[] = [];
            const project = new Project(OPTIONS).addSystem((reg) => {
                const work = delay(1).then(() => reg.add(new Block("dirt")));
                late.push(work);
                return work;
            });
            await expect(project.run()).rejects.toThrow(AsyncSystemError);
            await expect(late[0]).rejects.toThrow(RegistryClosedError);
        });
    });
});

describe(prepared.name, () => {
    test("passes each prepared value to its own system", async () => {
        const seen: string[] = [];
        await new Project(OPTIONS)
            .addSystem(
                "setup",
                prepared({
                    prepare: async () => {
                        await delay(5);
                        return "slow";
                    },
                    run: (_, data) => seen.push(data),
                }),
                prepared({ prepare: async () => "fast", run: (_, data) => seen.push(data) }),
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
                prepared({
                    prepare: async () => {
                        order.push("prepare");
                    },
                    run: () => order.push("run"),
                }),
            )
            .run();
        expect(order).toStrictEqual(["prepare", "system", "run"]);
    });

    test("starts every prepare step at once", async () => {
        const gate = Promise.withResolvers<void>();
        // The first step waits for the second, so the run would never end if they ran in turn.
        await new Project(OPTIONS)
            .addSystem(
                prepared({ prepare: () => gate.promise, run: () => {} }),
                prepared({ prepare: async () => gate.resolve(), run: () => {} }),
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
                prepared({ prepare: () => Promise.reject(cause), run: () => {} }),
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
            prepared({ prepare: () => Promise.reject(new Error("offline")), run: () => {} }),
            prepared({
                prepare: async () => {
                    await delay(5);
                    finished = true;
                },
                run: () => {},
            }),
        );
        await expect(project.run()).rejects.toThrow(SystemFailedError);
        expect(finished).toBe(true);
    });

    test("reports the first rejected prepare step in system order", async () => {
        const first = new Error("first");
        await expect(
            new Project(OPTIONS)
                .addSystem(
                    prepared({
                        prepare: async () => {
                            await delay(5);
                            throw first;
                        },
                        run: () => {},
                    }),
                    prepared({ prepare: () => Promise.reject(new Error("second")), run: () => {} }),
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
            new Project(OPTIONS)
                .addSystem(prepared({ prepare: async () => [], run: addBiomes }))
                .run(),
        ).rejects.toThrow(
            expect.objectContaining({ message: "System 0 (addBiomes) on transform failed in run" }),
        );
    });

    test("rejects a run function that returns a promise", async () => {
        await expect(
            new Project(OPTIONS)
                .addSystem(prepared({ prepare: async () => 1, run: () => Promise.resolve() }))
                .run(),
        ).rejects.toThrow(AsyncSystemError);
    });
});

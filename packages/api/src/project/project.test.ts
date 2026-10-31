import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, test } from "vite-plus/test";

import { Block } from "#/block/index";
import type { Definition } from "#/core/definition";
import {
    type Plugin,
    PluginFailedError,
    prepared,
    Project,
    type Registry,
    RegistryClosedError,
    SystemAddedDuringRunError,
    SystemFailedError,
} from "#/project/index";

const NS = "test";

const OPTIONS = { namespace: NS } as const;

function ids(defs: Iterable<Definition>): string[] {
    return Array.from(defs, (def) => def.identifier);
}

class LangPlugin implements Plugin {
    build(): void {}
}

class DefaultPlugins implements Plugin {
    build(project: Project): void {
        project.addPlugin(new LangPlugin());
    }
}

class Loop implements Plugin {
    build(project: Project): void {
        project.addPlugin(new Loop());
    }
}

describe(Project.name, () => {
    describe("run()", () => {
        test("runs setup, transform, then finalize, each in insertion order", async () => {
            const order: string[] = [];
            const push = (name: string) => () => {
                order.push(name);
            };
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
                .addSystem("finalize", () => {
                    order.push("finalize");
                })
                .addSystem(() => {
                    order.push("default");
                })
                .addSystem("setup", () => {
                    order.push("setup");
                })
                .run();
            expect(order).toStrictEqual(["setup", "default", "finalize"]);
        });

        test("lets systems see definitions added by earlier systems", async () => {
            let found: Block[] = [];
            await new Project(OPTIONS)
                .addSystem("setup", (reg) => {
                    reg.add(new Block("dirt"));
                })
                .addSystem((reg) => {
                    found = reg.resolve(Block, "dirt");
                })
                .run();
            expect(ids(found)).toStrictEqual(["dirt"]);
        });

        test("uses a new registry on every run", async () => {
            const regs: Registry[] = [];
            const project = new Project(OPTIONS).addSystem((reg) => {
                regs.push(reg);
            });
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
                (reg) => {
                    kept = reg;
                },
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
            project.addSystem("setup", () => {
                project.addSystem(() => {});
            });
            await expect(project.run()).rejects.toThrow(
                expect.objectContaining({
                    name: "SystemFailedError",
                    message: "System 0 on setup failed in run",
                    cause: expect.objectContaining({
                        name: "SystemAddedDuringRunError",
                        message:
                            "Can't add systems or plugins while the project runs. Add them before run(), or in a plugin's build() before it ends",
                    }),
                }),
            );
        });

        test("waits for an async system before the next one", async () => {
            const order: string[] = [];
            await new Project(OPTIONS)
                .addSystem(
                    "setup",
                    async (reg) => {
                        await delay(1);
                        reg.add(new Block("dirt"));
                        order.push("async");
                    },
                    (reg) => {
                        order.push(...ids(reg.all()));
                    },
                )
                .run();
            expect(order).toStrictEqual(["async", "dirt"]);
        });

        test("waits for the async run function of a prepared system", async () => {
            const order: string[] = [];
            await new Project(OPTIONS)
                .addSystem(
                    prepared(
                        async () => "data",
                        async (_, data) => {
                            await delay(1);
                            order.push(data);
                        },
                    ),
                    () => {
                        order.push("after");
                    },
                )
                .run();
            expect(order).toStrictEqual(["data", "after"]);
        });
    });

    describe("addPlugin()", () => {
        test("calls plugins with the project only when it runs", async () => {
            const seen: Project[] = [];
            class SeenPlugin implements Plugin {
                build(project: Project): void {
                    seen.push(project);
                }
            }
            const project = new Project(OPTIONS).addPlugin(new SeenPlugin());
            expect(seen).toHaveLength(0);
            await project.run();
            expect(seen).toStrictEqual([project]);
        });

        test("calls plugins again on every run, and doesn't keep their systems", async () => {
            let calls = 0;
            const order: number[] = [];
            class CountPlugin implements Plugin {
                build(project: Project): void {
                    const call = ++calls;
                    project.addSystem(() => {
                        order.push(call);
                    });
                }
            }
            const project = new Project(OPTIONS).addPlugin(new CountPlugin());
            await project.run();
            await project.run();
            expect(order).toStrictEqual([1, 2]);
        });

        test("runs plugin systems after the project's, and a plugin's plugins before its next sibling", async () => {
            const order: string[] = [];
            const push = (name: string) => () => {
                order.push(name);
            };
            class Inner implements Plugin {
                build(project: Project): void {
                    project.addSystem(push("inner"));
                }
            }
            class Outer implements Plugin {
                build(project: Project): void {
                    project
                        .addSystem(push("outer 1"))
                        .addPlugin(new Inner())
                        .addSystem(push("outer 2"));
                }
            }
            class Sibling implements Plugin {
                build(project: Project): void {
                    project.addSystem(push("sibling"));
                }
            }
            await new Project(OPTIONS)
                .addSystem(push("before"))
                .addPlugin(new Outer(), new Sibling())
                .addSystem(push("after"))
                .run();
            expect(order).toStrictEqual([
                "before",
                "after",
                "outer 1",
                "outer 2",
                "inner",
                "sibling",
            ]);
        });

        test("waits for async plugins, and keeps their systems in order", async () => {
            const order: string[] = [];
            const push = (name: string) => () => {
                order.push(name);
            };
            class Inner implements Plugin {
                async build(project: Project): Promise<void> {
                    await delay(5);
                    project.addSystem(push("inner"));
                }
            }
            class Outer implements Plugin {
                async build(project: Project): Promise<void> {
                    project.addSystem(push("outer 1")).addPlugin(new Inner());
                    await delay(1);
                    project.addSystem(push("outer 2"));
                }
            }
            class After implements Plugin {
                async build(project: Project): Promise<void> {
                    project.addSystem(push("after"));
                }
            }
            await new Project(OPTIONS).addPlugin(new Outer(), new After()).run();
            expect(order).toStrictEqual(["outer 1", "outer 2", "inner", "after"]);
        });

        test("rejects two plugins of one class, and names the plugin that added the first", async () => {
            await expect(
                new Project(OPTIONS).addPlugin(new DefaultPlugins(), new LangPlugin()).run(),
            ).rejects.toThrow(
                expect.objectContaining({
                    name: "DuplicatePluginError",
                    message: "Plugin LangPlugin is already added by DefaultPlugins",
                }),
            );
            await expect(
                new Project(OPTIONS).addPlugin(new LangPlugin(), new LangPlugin()).run(),
            ).rejects.toThrow(
                expect.objectContaining({
                    name: "DuplicatePluginError",
                    message: "Plugin LangPlugin is already added",
                }),
            );
        });

        test("rejects a plugin that adds its own class", async () => {
            await expect(new Project(OPTIONS).addPlugin(new Loop()).run()).rejects.toThrow(
                expect.objectContaining({
                    name: "DuplicatePluginError",
                    message: "Plugin Loop is already added",
                }),
            );
        });

        test("rejects plugins while the project runs", async () => {
            const project = new Project(OPTIONS);
            project.addSystem("setup", () => {
                project.addPlugin(new LangPlugin());
            });
            await expect(project.run()).rejects.toThrow(
                expect.objectContaining({
                    name: "SystemFailedError",
                    cause: expect.objectContaining({ name: "SystemAddedDuringRunError" }),
                }),
            );
        });

        test("rejects systems that a plugin adds after its build() ends, while systems run", async () => {
            const late: Promise<unknown>[] = [];
            class LatePlugin implements Plugin {
                build(project: Project): void {
                    late.push(delay(1).then(() => project.addSystem(() => {})));
                }
            }
            const run = new Project(OPTIONS)
                .addPlugin(new LatePlugin())
                .addSystem(() => delay(5))
                .run();
            await expect(late[0]).rejects.toThrow(SystemAddedDuringRunError);
            await run;
        });

        test("runs no system if a plugin fails", async () => {
            let ran = false;
            class OfflinePlugin implements Plugin {
                async build(): Promise<void> {
                    await delay(1);
                    throw new Error("offline");
                }
            }
            const project = new Project(OPTIONS)
                .addSystem("setup", () => {
                    ran = true;
                })
                .addPlugin(new OfflinePlugin());
            await expect(project.run()).rejects.toThrow(PluginFailedError);
            expect(ran).toBe(false);
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

        test("wrap what an async system rejects with", async () => {
            const cause = new Error("boom");
            await expect(
                new Project(OPTIONS)
                    .addSystem("setup", async function addDirt() {
                        await delay(1);
                        throw cause;
                    })
                    .run(),
            ).rejects.toThrow(
                expect.objectContaining({
                    name: "SystemFailedError",
                    message: "System 0 (addDirt) on setup failed in run",
                    cause,
                }),
            );
        });

        test("name the plugins that added a system, from the innermost", async () => {
            const cause = new Error("boom");
            class BlockPlugin implements Plugin {
                build(project: Project): void {
                    project.addSystem("setup", function addDirt() {
                        throw cause;
                    });
                }
            }
            class DefaultPlugins implements Plugin {
                build(project: Project): void {
                    project.addPlugin(new BlockPlugin());
                }
            }
            await expect(
                new Project(OPTIONS).addPlugin(new DefaultPlugins()).run(),
            ).rejects.toThrow(
                expect.objectContaining({
                    name: "SystemFailedError",
                    message:
                        "System 0 (addDirt) on setup from plugin BlockPlugin in DefaultPlugins failed in run",
                    cause,
                }),
            );
        });

        test("wrap what a plugin throws, with the plugins that added it", async () => {
            const cause = new Error("boom");
            class BlockPlugin implements Plugin {
                build(): void {
                    throw cause;
                }
            }
            const outer = new (class implements Plugin {
                build(project: Project): void {
                    project.addPlugin(new BlockPlugin());
                }
            })();
            await expect(new Project(OPTIONS).addPlugin(outer).run()).rejects.toThrow(
                expect.objectContaining({
                    name: "PluginFailedError",
                    message: "Plugin BlockPlugin in (anonymous) failed",
                    cause,
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
                    (_, data) => {
                        seen.push(data);
                    },
                ),
                prepared(
                    async () => "fast",
                    (_, data) => {
                        seen.push(data);
                    },
                ),
            )
            .run();
        expect(seen).toStrictEqual(["slow", "fast"]);
    });

    test("prepares before any system runs", async () => {
        const order: string[] = [];
        await new Project(OPTIONS)
            .addSystem("setup", () => {
                order.push("system");
            })
            .addSystem(
                "finalize",
                prepared(
                    async () => {
                        order.push("prepare");
                    },
                    () => {
                        order.push("run");
                    },
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
            .addSystem("setup", () => {
                ran = true;
            })
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

import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, test } from "vite-plus/test";

import { RunFailedError } from "#/diagnostic";
import { DuplicatePlugin, type Plugin, PluginFailed, SystemAddedDuringRunError } from "#/plugin";
import { Project } from "#/project";
import { DuplicatePath, FrozenRegistry, type Registry, RegistryFrozenError } from "#/registry";
import { type Schedule, SystemOrderCycle } from "#/schedule";
import {
    ordered,
    type PreparedSystem,
    prepared,
    type System,
    SystemFailed,
    ScheduledSystem,
} from "#/system";
import { Clash, Leaf, Notes, remark } from "#/test/fixtures";
import { diagnosticsOf, ids, json, NS } from "#/test/helpers";

class LangPlugin implements Plugin {
    build(): void {}
}

class DefaultPlugins implements Plugin {
    readonly lang = new LangPlugin();

    build(project: Project): void {
        project.addPlugin(this.lang);
    }
}

class Loop implements Plugin {
    child?: Loop;

    build(project: Project): void {
        this.child = new Loop();
        project.addPlugin(this.child);
    }
}

function scheduled(
    system: System | PreparedSystem<unknown>,
    schedule: Schedule,
    index: number,
    plugins: Plugin[] = [],
): ScheduledSystem {
    return new ScheduledSystem(system, schedule, index, plugins);
}

describe(Project.name, () => {
    describe("run()", () => {
        test("runs setup, transform, then finalize, each in insertion order", async () => {
            const order: string[] = [];
            const push = (name: string) => () => {
                order.push(name);
            };
            const schedules = ["finalize", "transform", "setup"] as const;
            const project = new Project(NS);
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
            await new Project(NS)
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
            let found: Leaf[] = [];
            await new Project(NS)
                .addSystem("setup", (reg) => {
                    reg.add(new Leaf("dirt"));
                })
                .addSystem((reg) => {
                    found = reg.resolve(Leaf, "dirt");
                })
                .run();
            expect(ids(found)).toStrictEqual(["dirt"]);
        });

        test("uses a new registry on every run", async () => {
            const regs: Registry[] = [];
            const project = new Project(NS).addSystem((reg) => {
                regs.push(reg);
            });
            await project.run();
            await project.run();
            expect(regs.length).toBe(2);
            expect(regs[0]).not.toBe(regs[1]);
        });

        test("can add a definition of an earlier run again", async () => {
            const dirt = new Leaf("dirt");
            const regs: Registry[] = [];
            const project = new Project(NS).addSystem("setup", (reg) => {
                regs.push(reg);
                reg.add(dirt);
            });
            await project.run();
            await project.run();
            expect([...regs[0].entries()]).toStrictEqual([dirt]);
            expect([...regs[1].entries()]).toStrictEqual([dirt]);
        });

        test("rejects a run while another run is active", async () => {
            const project = new Project(NS).addSystem(
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
            await expect(project.run()).resolves.toBeInstanceOf(FrozenRegistry);
        });

        test("can run again after a failed run", async () => {
            let fail = true;
            const project = new Project(NS).addSystem(() => {
                if (fail) throw new Error("boom");
            });
            await expect(project.run()).rejects.toThrow(RunFailedError);
            fail = false;
            await expect(project.run()).resolves.toBeInstanceOf(FrozenRegistry);
        });

        test("freezes the registry after a failed run", async () => {
            let kept: Registry;
            const project = new Project(NS).addSystem(
                (reg) => {
                    kept = reg;
                },
                () => {
                    throw new Error("boom");
                },
            );
            await expect(project.run()).rejects.toThrow(RunFailedError);
            expect(() => kept.add(new Leaf("dirt"))).toThrow(RegistryFrozenError);
        });
    });

    describe("the returned registry", () => {
        test("emits the files of the run, with the project's namespace", async () => {
            const project = new Project(NS).addSystem("setup", (reg) => {
                reg.add(new Leaf("dirt"));
            });
            const reg = await project.run();
            expect(json(reg.emit())).toStrictEqual([
                {
                    kind: "behavior",
                    path: "leaves/dirt.json",
                    format: "json",
                    value: {
                        "test:leaf": { description: { identifier: `${NS}:dirt` } },
                    },
                },
            ]);
        });

        test("emits resources before entries", async () => {
            const project = new Project(NS).addSystem("setup", (reg) => {
                reg.add(new Leaf("dirt"));
                reg.resource(Notes).lines.push("hello");
            });
            const reg = await project.run();
            expect(reg.emit().map((file) => `${file.kind}/${file.path}`)).toStrictEqual([
                "resource/notes.txt",
                "behavior/leaves/dirt.json",
            ]);
        });

        test("reads the run's entries and resources, but can't create resources", async () => {
            const dirt = new Leaf("dirt");
            const project = new Project(NS).addSystem("setup", (reg) => {
                reg.add(dirt);
                reg.resource(Notes);
            });
            const reg = await project.run();
            expect([reg.namespace, [...reg.entries()]]).toStrictEqual([NS, [dirt]]);
            expect(reg.resolve(Leaf, `${NS}:dirt`)).toStrictEqual([dirt]);
            expect(reg.resource(Notes)).toBeInstanceOf(Notes);
            expect(() => reg.resource(Clash)).toThrow(RegistryFrozenError);
        });
    });

    describe("addSystem()", () => {
        test("rejects systems while the project runs", async () => {
            const project = new Project(NS);
            const addLate = () => {
                project.addSystem(() => {});
            };
            project.addSystem("setup", addLate);
            expect(await diagnosticsOf(project.run())).toStrictEqual([
                new SystemFailed(
                    scheduled(addLate, "setup", 0),
                    "run",
                    expect.objectContaining({
                        name: "SystemAddedDuringRunError",
                        message:
                            "Can't add systems or plugins while the project runs. Add them before run(), or in a plugin's build() before it ends",
                    }),
                ),
            ]);
        });

        test("waits for an async system before the next one", async () => {
            const order: string[] = [];
            await new Project(NS)
                .addSystem(
                    "setup",
                    async (reg) => {
                        await delay(1);
                        reg.add(new Leaf("dirt"));
                        order.push("async");
                    },
                    (reg) => {
                        order.push(...ids(reg.entries()));
                    },
                )
                .run();
            expect(order).toStrictEqual(["async", "dirt"]);
        });

        test("waits for the async run function of a prepared system", async () => {
            const order: string[] = [];
            await new Project(NS)
                .addSystem(
                    prepared(
                        () => "data",
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
            const project = new Project(NS).addPlugin(new SeenPlugin());
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
            const project = new Project(NS).addPlugin(new CountPlugin());
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
            await new Project(NS)
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
            await new Project(NS).addPlugin(new Outer(), new After()).run();
            expect(order).toStrictEqual(["outer 1", "outer 2", "inner", "after"]);
        });

        test("rejects two plugins of one class, with the plugins that added each", async () => {
            const defaults = new DefaultPlugins();
            const lang = new LangPlugin();
            expect(
                await diagnosticsOf(new Project(NS).addPlugin(defaults, lang).run()),
            ).toStrictEqual([new DuplicatePlugin([defaults, defaults.lang], [lang])]);
        });

        test("records every duplicate plugin, and calls the plugins after a duplicate", async () => {
            const [first, second, third] = [new LangPlugin(), new LangPlugin(), new LangPlugin()];
            let called = false;
            class LaterPlugin implements Plugin {
                build(): void {
                    called = true;
                }
            }
            const project = new Project(NS).addPlugin(first, second, third, new LaterPlugin());
            expect(await diagnosticsOf(project.run())).toStrictEqual([
                new DuplicatePlugin([first], [second]),
                new DuplicatePlugin([first], [third]),
            ]);
            expect(called).toBe(true);
        });

        test("rejects a plugin that adds its own class", async () => {
            const loop = new Loop();
            expect(await diagnosticsOf(new Project(NS).addPlugin(loop).run())).toStrictEqual([
                new DuplicatePlugin([loop], [loop, loop.child as Loop]),
            ]);
        });

        test("rejects plugins while the project runs", async () => {
            const project = new Project(NS);
            project.addSystem("setup", () => {
                project.addPlugin(new LangPlugin());
            });
            expect(await diagnosticsOf(project.run())).toStrictEqual([
                expect.objectContaining({ cause: expect.any(SystemAddedDuringRunError) }),
            ]);
        });

        test("rejects systems that a plugin adds after its build() ends, while systems run", async () => {
            const late: Promise<unknown>[] = [];
            class LatePlugin implements Plugin {
                build(project: Project): void {
                    late.push(delay(1).then(() => project.addSystem(() => {})));
                }
            }
            const run = new Project(NS)
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
            const project = new Project(NS)
                .addSystem("setup", () => {
                    ran = true;
                })
                .addPlugin(new OfflinePlugin());
            await expect(project.run()).rejects.toThrow(RunFailedError);
            expect(ran).toBe(false);
        });
    });

    describe("diagnostics", () => {
        test("record what a system throws, with its schedule and index", async () => {
            const cause = new Error("boom");
            const addDirt = () => {
                throw cause;
            };
            expect(
                await diagnosticsOf(new Project(NS).addSystem("setup", () => {}, addDirt).run()),
            ).toStrictEqual([new SystemFailed(scheduled(addDirt, "setup", 1), "run", cause)]);
        });

        test("record what an async system rejects with", async () => {
            const cause = new Error("boom");
            const addDirt = async () => {
                await delay(1);
                throw cause;
            };
            expect(
                await diagnosticsOf(new Project(NS).addSystem("setup", addDirt).run()),
            ).toStrictEqual([new SystemFailed(scheduled(addDirt, "setup", 0), "run", cause)]);
        });

        test("use the added index of a system, also when order rules move it", async () => {
            const cause = new Error("boom");
            const addDirt = () => {
                throw cause;
            };
            const project = new Project(NS).addSystem(() => {}, ordered(addDirt).beforeAll());
            expect(await diagnosticsOf(project.run())).toStrictEqual([
                new SystemFailed(scheduled(addDirt, "transform", 1), "run", cause),
            ]);
        });

        test("record the plugins that added a system, from the outermost", async () => {
            const cause = new Error("boom");
            const addDirt = () => {
                throw cause;
            };
            class BlockPlugin implements Plugin {
                build(project: Project): void {
                    project.addSystem("setup", addDirt);
                }
            }
            const blocks = new BlockPlugin();
            class DefaultPlugins implements Plugin {
                build(project: Project): void {
                    project.addPlugin(blocks);
                }
            }
            const defaults = new DefaultPlugins();
            expect(await diagnosticsOf(new Project(NS).addPlugin(defaults).run())).toStrictEqual([
                new SystemFailed(scheduled(addDirt, "setup", 0, [defaults, blocks]), "run", cause),
            ]);
        });

        test("record what a plugin throws, with the plugins that added it", async () => {
            const cause = new Error("boom");
            class BlockPlugin implements Plugin {
                build(): void {
                    throw cause;
                }
            }
            const blocks = new BlockPlugin();
            const outer = new (class implements Plugin {
                build(project: Project): void {
                    project.addPlugin(blocks);
                }
            })();
            expect(await diagnosticsOf(new Project(NS).addPlugin(outer).run())).toStrictEqual([
                new PluginFailed([outer, blocks], cause),
            ]);
        });
    });
});

describe("reported diagnostics", () => {
    test("return the warnings that systems report, in order", async () => {
        const first = remark("warning", "first");
        const second = remark("warning", "second");
        const reg = await new Project(NS)
            .addSystem((reg) => {
                reg.report(first);
            })
            .addSystem("finalize", (reg) => {
                reg.report(second);
            })
            .run();
        expect(reg.warnings).toStrictEqual([first, second]);
    });

    test("return no warnings if no system reports one", async () => {
        expect((await new Project(NS).run()).warnings).toStrictEqual([]);
    });

    test("make the run fail after the last system if one is an error, and keep the warnings", async () => {
        const warning = remark("warning", "careful");
        const error = remark("error", "broken");
        let ran = false;
        const project = new Project(NS).addSystem(
            (reg) => {
                reg.report(warning, error);
            },
            () => {
                ran = true;
            },
        );
        expect(await diagnosticsOf(project.run())).toStrictEqual([warning, error]);
        expect(ran).toBe(true);
    });

    test("come before a failed system, and before path clashes", async () => {
        const warning = remark("warning", "careful");
        const cause = new Error("boom");
        const fail = () => {
            throw cause;
        };
        const failing = new Project(NS).addSystem((reg) => {
            reg.report(warning);
        }, fail);
        expect(await diagnosticsOf(failing.run())).toStrictEqual([
            warning,
            new SystemFailed(scheduled(fail, "transform", 1), "run", cause),
        ]);

        const error = remark("error", "broken");
        const clashing = new Project(NS).addSystem((reg) => {
            reg.report(error);
            reg.add(new Leaf("dirt"), new Leaf("dirt"));
        });
        expect(await diagnosticsOf(clashing.run())).toStrictEqual([
            error,
            expect.any(DuplicatePath),
        ]);
    });
});

describe(prepared.name, () => {
    test("passes each prepared value to its own system", async () => {
        const seen: string[] = [];
        await new Project(NS)
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
                    () => "fast",
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
        await new Project(NS)
            .addSystem("setup", () => {
                order.push("system");
            })
            .addSystem(
                "finalize",
                prepared(
                    () => {
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
        await new Project(NS)
            .addSystem(
                prepared(
                    () => gate.promise,
                    () => {},
                ),
                prepared(
                    () => {
                        gate.resolve();
                    },
                    () => {},
                ),
            )
            .run();
    });

    test("runs no system if a prepare step rejects", async () => {
        const cause = new Error("offline");
        let ran = false;
        const offline = prepared(
            () => Promise.reject(cause),
            () => {},
        );
        const project = new Project(NS)
            .addSystem("setup", () => {
                ran = true;
            })
            .addSystem("finalize", offline);
        expect(await diagnosticsOf(project.run())).toStrictEqual([
            new SystemFailed(scheduled(offline, "finalize", 0), "prepare", cause),
        ]);
        expect(ran).toBe(false);
    });

    test("rejects only after every prepare step ends", async () => {
        let finished = false;
        const project = new Project(NS).addSystem(
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
        await expect(project.run()).rejects.toThrow(RunFailedError);
        expect(finished).toBe(true);
    });

    test("records every rejected prepare step, in system order", async () => {
        const first = new Error("first");
        const second = new Error("second");
        const slow = prepared(
            async () => {
                await delay(5);
                throw first;
            },
            () => {},
        );
        const fast = prepared(
            () => Promise.reject(second),
            () => {},
        );
        expect(await diagnosticsOf(new Project(NS).addSystem(slow, fast).run())).toStrictEqual([
            new SystemFailed(scheduled(slow, "transform", 0), "prepare", first),
            new SystemFailed(scheduled(fast, "transform", 1), "prepare", second),
        ]);
    });

    test("records a prepare step that throws, after every prepare step ends", async () => {
        const cause = new Error("offline");
        let finished = false;
        const offline = prepared(
            () => {
                throw cause;
            },
            () => {},
        );
        const slow = prepared(
            async () => {
                await delay(5);
                finished = true;
            },
            () => {},
        );
        expect(await diagnosticsOf(new Project(NS).addSystem(offline, slow).run())).toStrictEqual([
            new SystemFailed(scheduled(offline, "transform", 0), "prepare", cause),
        ]);
        expect(finished).toBe(true);
    });
});

function recorder(): { order: string[]; system: (name: string) => System } {
    const order: string[] = [];
    return {
        order,
        system: (name) => () => {
            order.push(name);
        },
    };
}

function cycleFirst(): void {}

function cycleSecond(): void {}

function important(): void {}

function two(): void {}

describe(ordered.name, () => {
    test("afterAll() runs after the other systems of the schedule, also later ones from plugins", async () => {
        const { order, system } = recorder();
        class Late implements Plugin {
            build(project: Project): void {
                project.addSystem("finalize", system("plugin"));
            }
        }
        await new Project(NS)
            .addSystem("finalize", ordered(system("last")).afterAll(), system("own"))
            .addPlugin(new Late())
            .run();
        expect(order).toStrictEqual(["own", "plugin", "last"]);
    });

    test("beforeAll() runs before the other systems of the schedule, also the project's own", async () => {
        const { order, system } = recorder();
        class Defaults implements Plugin {
            build(project: Project): void {
                project.addSystem("setup", ordered(system("defaults")).beforeAll());
            }
        }
        await new Project(NS).addSystem("setup", system("own")).addPlugin(new Defaults()).run();
        expect(order).toStrictEqual(["defaults", "own"]);
    });

    test("keeps the added order among afterAll() systems and among beforeAll() systems", async () => {
        const { order, system } = recorder();
        await new Project(NS)
            .addSystem(
                ordered(system("last 1")).afterAll(),
                ordered(system("first 1")).beforeAll(),
                system("middle"),
                ordered(system("last 2")).afterAll(),
                ordered(system("first 2")).beforeAll(),
            )
            .run();
        expect(order).toStrictEqual(["first 1", "first 2", "middle", "last 1", "last 2"]);
    });

    test("after() and before() reorder systems, and keep the added order otherwise", async () => {
        const { order, system } = recorder();
        const b = system("b");
        const c = system("c");
        await new Project(NS)
            .addSystem(ordered(system("a")).after(c), b, c, ordered(system("d")).before(b))
            .run();
        expect(order).toStrictEqual(["c", "a", "d", "b"]);
    });

    test("orders systems only inside their schedule", async () => {
        const { order, system } = recorder();
        await new Project(NS)
            .addSystem("transform", system("transform"))
            .addSystem("setup", ordered(system("setup last")).afterAll(), system("setup"))
            .run();
        expect(order).toStrictEqual(["setup", "setup last", "transform"]);
    });

    test("ignores rules about systems that aren't in the schedule", async () => {
        const { order, system } = recorder();
        const elsewhere = system("elsewhere");
        await new Project(NS)
            .addSystem("setup", elsewhere)
            .addSystem(ordered(system("a")).after(elsewhere).before(system("missing")), system("b"))
            .run();
        expect(order).toStrictEqual(["elsewhere", "a", "b"]);
    });

    test("applies a rule to each time that a system was added", async () => {
        const { order, system } = recorder();
        const twice = system("twice");
        await new Project(NS).addSystem(ordered(system("a")).after(twice), twice, twice).run();
        expect(order).toStrictEqual(["twice", "twice", "a"]);
    });

    test("uses the last of afterAll() and beforeAll()", async () => {
        const { order, system } = recorder();
        await new Project(NS)
            .addSystem(system("b"), ordered(system("a")).afterAll().beforeAll())
            .run();
        expect(order).toStrictEqual(["a", "b"]);
    });

    test("gives a prepared system its data", async () => {
        const { order, system } = recorder();
        await new Project(NS)
            .addSystem(
                ordered(
                    prepared(
                        () => "prepared",
                        (_, data) => {
                            order.push(data);
                        },
                    ),
                ).afterAll(),
                system("b"),
            )
            .run();
        expect(order).toStrictEqual(["b", "prepared"]);
    });

    test("rejects rules that form a cycle, before any prepare step starts", async () => {
        let started = false;
        const project = new Project(NS).addSystem(
            ordered(cycleFirst).after(cycleSecond),
            ordered(cycleSecond).after(cycleFirst),
            prepared(
                () => {
                    started = true;
                },
                () => {},
            ),
        );
        expect(await diagnosticsOf(project.run())).toStrictEqual([
            new SystemOrderCycle("transform", [
                { system: scheduled(cycleSecond, "transform", 1), rule: "after" },
                { system: scheduled(cycleFirst, "transform", 0), rule: "after" },
            ]),
        ]);
        await expect(project.run()).rejects.toThrow(RunFailedError);
        expect(started).toBe(false);
    });

    test("records the rule that makes each system of a cycle run before the next", async () => {
        const project = new Project(NS).addSystem(
            "setup",
            ordered(important).afterAll().before(two),
            two,
        );
        expect(await diagnosticsOf(project.run())).toStrictEqual([
            new SystemOrderCycle("setup", [
                { system: scheduled(two, "setup", 1), rule: "afterAll" },
                { system: scheduled(important, "setup", 0), rule: "before" },
            ]),
        ]);
    });

    test("records a cycle in each schedule", async () => {
        const project = new Project(NS)
            .addSystem("setup", ordered(important).beforeAll().after(two), two)
            .addSystem(
                "finalize",
                ordered(cycleFirst).before(cycleSecond),
                ordered(cycleSecond).before(cycleFirst),
            );
        expect(await diagnosticsOf(project.run())).toStrictEqual([
            new SystemOrderCycle("setup", [
                { system: scheduled(two, "setup", 1), rule: "after" },
                { system: scheduled(important, "setup", 0), rule: "beforeAll" },
            ]),
            new SystemOrderCycle("finalize", [
                { system: scheduled(cycleSecond, "finalize", 1), rule: "before" },
                { system: scheduled(cycleFirst, "finalize", 0), rule: "before" },
            ]),
        ]);
    });
});

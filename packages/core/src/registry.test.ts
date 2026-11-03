import { setTimeout as delay } from "node:timers/promises";

import { beforeAll, describe, expect, test } from "vite-plus/test";

import { Entry } from "#/entry";
import type { Emitted, PackKind } from "#/output";
import { Project } from "#/project";
import { DuplicatePath, type Registry, RegistryFrozenError } from "#/registry";
import { ScheduledSystem } from "#/system";
import { Branch, Clash, Custom, Leaf, Node, Notes, remark, Twig } from "#/test/fixtures";
import { diagnosticsOf, ids, NS, registryWith, runSetup } from "#/test/helpers";

async function inSystem<T>(fn: (reg: Registry) => T, ...entries: Entry[]): Promise<T> {
    const result = Promise.withResolvers<T>();
    await runSetup(
        NS,
        (reg) => {
            reg.add(...entries);
        },
        (reg) => result.resolve(fn(reg)),
    );
    return result.promise;
}

describe("Registry", () => {
    describe("add()", () => {
        test("registers definitions and chains", async () => {
            const block = new Leaf("dirt");
            await inSystem((reg) => {
                expect(reg.add(block)).toBe(reg);
                expect([...reg.entries()]).toStrictEqual([block]);
            });
        });

        test("ignores the same instance added twice", async () => {
            const block = new Leaf("dirt");
            const reg = await inSystem((reg) => reg.add(block).add(block));
            expect([...reg.entries()]).toStrictEqual([block]);
        });

        test("accepts a definition at a file freed by a removal", async () => {
            const dirt = new Leaf("dirt");
            const reg = await inSystem((reg) => {
                reg.remove(...reg.entries());
                return reg.add(dirt);
            }, new Leaf("dirt"));
            expect([...reg.entries()]).toStrictEqual([dirt]);
        });

        test("allows the same identifier across kinds", async () => {
            const reg = await registryWith(
                new Leaf("thing"),
                new Node("thing"),
                new Custom("thing"),
            );
            expect([...reg.entries()].length).toBe(3);
        });

        test("accepts a definition that another project holds", async () => {
            const dirt = new Leaf("dirt");
            await registryWith(dirt);
            const reg = await runSetup("other", (reg) => {
                reg.add(dirt);
            });
            expect([...reg.entries()]).toStrictEqual([dirt]);
        });

        test("registers any definition kind", async () => {
            const custom = new Custom("custom");
            expect([...(await registryWith(custom)).entries()]).toStrictEqual([custom]);
        });

        test("registers nested definition instances", async () => {
            const ore = new Node("ore");
            const scatter = new Node("scatter", { links: [ore] });
            const rules = new Node("rules", { links: [scatter] });
            const reg = await registryWith(rules);
            expect(ids(reg.entries())).toStrictEqual(["rules", "scatter", "ore"]);
        });

        test("registers reference cycles", async () => {
            const a = new Node("a");
            a.links.push(new Node("b", { links: [a] }));
            expect(ids((await registryWith(a)).entries())).toStrictEqual(["a", "b"]);
        });

        test("does not register string references", async () => {
            const reg = await registryWith(new Node("scatter", { links: [`${NS}:ore`] }));
            expect(ids(reg.entries())).toStrictEqual(["scatter"]);
        });
    });

    describe("remove()", () => {
        test("unregisters definitions", async () => {
            const dirt = new Leaf("dirt");
            const stone = new Leaf("stone");
            const reg = await inSystem(
                (reg) => {
                    reg.remove(dirt);
                    return reg;
                },
                dirt,
                stone,
            );
            expect([...reg.entries()]).toStrictEqual([stone]);
        });

        test("ignores another instance with the same identifier", async () => {
            const dirt = new Leaf("dirt");
            const reg = await inSystem((reg) => {
                reg.remove(new Leaf("dirt"));
                return reg;
            }, dirt);
            expect([...reg.entries()]).toStrictEqual([dirt]);
        });
    });

    describe("after its run", () => {
        test("rejects add(), remove() and report()", async () => {
            const dirt = new Leaf("dirt");
            const reg = await registryWith(dirt);
            expect(() => reg.add(new Leaf("stone"))).toThrow(
                expect.objectContaining({
                    name: "RegistryFrozenError",
                    message:
                        "Can't change a registry after its run ended. A system may have kept the registry, or changed it from async work",
                }),
            );
            expect(() => reg.remove(dirt)).toThrow(RegistryFrozenError);
            expect(() => reg.report(remark("warning", "late"))).toThrow(RegistryFrozenError);
            expect([...reg.entries()]).toStrictEqual([dirt]);
        });

        test("rejects changes from a system's async work", async () => {
            const late: Promise<unknown>[] = [];
            await runSetup(NS, (reg) => {
                late.push(delay(1).then(() => reg.add(new Leaf("dirt"))));
            });
            await expect(late[0]).rejects.toThrow(RegistryFrozenError);
        });
    });

    describe("resource()", () => {
        test("creates the resource on first use, then returns the same one", async () => {
            await inSystem((reg) => {
                const notes = reg.resource(Notes);
                expect(notes).toBeInstanceOf(Notes);
                expect(reg.resource(Notes)).toBe(notes);
            });
        });

        test("creates a new resource in each registry", async () => {
            const first = await inSystem((reg) => reg.resource(Notes));
            const second = await inSystem((reg) => reg.resource(Notes));
            expect(first).not.toBe(second);
        });

        test("after its run, returns existing resources and rejects new ones", async () => {
            const reg = await runSetup(NS, (reg) => {
                reg.resource(Notes);
            });
            expect(reg.resource(Notes)).toBeInstanceOf(Notes);
            expect(() => reg.resource(Clash)).toThrow(RegistryFrozenError);
        });
    });

    describe("file paths", () => {
        // An entry at the path of `Notes`, so that it clashes with `Notes` unless `Notes` is empty.
        class NotesEntry extends Entry {
            readonly kind: PackKind = "resource";
            readonly path = "notes.txt";

            emit(): Emitted {
                return { format: "text", value: "" };
            }

            key(): string {
                return "notes";
            }
        }

        test("make the run fail if two files in one pack have the same path", async () => {
            const first = new Leaf("dirt");
            const second = new Leaf("dirt");
            const addFirst = (reg: Registry) => {
                reg.add(first);
            };
            const addSecond = (reg: Registry) => {
                reg.add(second);
            };
            const project = new Project(NS).addSystem("setup", addFirst).addSystem(addSecond);
            expect(await diagnosticsOf(project.run())).toStrictEqual([
                new DuplicatePath("behavior", "leaves/dirt.json", [
                    {
                        output: first,
                        addedBy: new ScheduledSystem(addFirst, "setup", 0, []),
                    },
                    {
                        output: second,
                        addedBy: new ScheduledSystem(addSecond, "transform", 0, []),
                    },
                ]),
            ]);
        });

        test("record each clash, also of a resource, and the system that added a reference", async () => {
            const custom = new Custom("clash");
            const ore = new Node("ore");
            const twin = new Node("ore");
            let clash!: Clash;
            const addAll = (reg: Registry) => {
                reg.add(custom, new Node("scatter", { links: [ore] }), twin);
                clash = reg.resource(Clash);
            };
            const addedBy = new ScheduledSystem(addAll, "setup", 0, []);
            const project = new Project(NS).addSystem("setup", addAll);
            expect(await diagnosticsOf(project.run())).toStrictEqual([
                new DuplicatePath("behavior", "custom/clash.json", [
                    { output: custom, addedBy },
                    { output: clash, addedBy },
                ]),
                new DuplicatePath("behavior", "branches/ore.json", [
                    { output: ore, addedBy },
                    { output: twin, addedBy },
                ]),
            ]);
        });

        test("ignore a clash that a system removes before the run ends", async () => {
            const first = new Leaf("dirt");
            const reg = await runSetup(
                NS,
                (reg) => {
                    reg.add(first, new Leaf("dirt"));
                },
                (reg) => {
                    reg.remove(first);
                },
            );
            expect(ids(reg.entries())).toStrictEqual(["dirt"]);
        });

        test("ignore an empty resource", async () => {
            await expect(
                runSetup(NS, (reg) => {
                    reg.resource(Notes);
                    reg.add(new NotesEntry());
                }),
            ).resolves.toBeDefined();
        });
    });

    describe("outputs()", () => {
        test("yields resources that aren't empty in creation order, then entries", async () => {
            const dirt = new Leaf("dirt");
            await inSystem((reg) => {
                const notes = reg.resource(Notes);
                const clash = reg.resource(Clash);
                reg.add(dirt);
                expect([...reg.outputs()]).toStrictEqual([clash, dirt]);
                notes.lines.push("hello");
                expect([...reg.outputs()]).toStrictEqual([notes, clash, dirt]);
            });
        });
    });

    describe("entries()", () => {
        test("yields definitions in the order they were added", async () => {
            const reg = await registryWith(
                new Node("rules", { links: [`${NS}:b_ore`] }),
                new Node("b_ore"),
                new Leaf("b_block"),
                new Node("a_ore"),
                new Leaf("a_block"),
            );
            expect(ids(reg.entries())).toStrictEqual([
                "rules",
                "b_ore",
                "b_block",
                "a_ore",
                "a_block",
            ]);
        });
    });

    describe("resolve()", () => {
        const dirt = new Leaf("dirt");
        const ore = new Node("ore");
        let reg: Registry;
        beforeAll(async () => {
            reg = await registryWith(dirt, ore);
        });

        test("finds a definition by class and identifier", () => {
            expect(reg.resolve(Leaf, "dirt")).toStrictEqual([dirt]);
        });

        test("strips this registry's namespace", () => {
            expect(reg.resolve(Leaf, `${NS}:dirt`)).toStrictEqual([dirt]);
        });

        test("matches base classes", () => {
            expect(reg.resolve(Branch, "ore")).toStrictEqual([ore]);
            expect(reg.resolve(Entry, "dirt")).toStrictEqual([dirt]);
        });

        test("misses other classes", () => {
            expect(reg.resolve(Leaf, "ore")).toStrictEqual([]);
            expect(reg.resolve(Twig, "ore")).toStrictEqual([]);
        });

        test("misses unknown identifiers and other namespaces", () => {
            expect(reg.resolve(Leaf, "stone")).toStrictEqual([]);
            expect(reg.resolve(Leaf, "other:dirt")).toStrictEqual([]);
        });

        test("finds every kind sharing an identifier, in the order they were added", async () => {
            const block = new Leaf("stone");
            const ore = new Node("stone");
            const reg = await registryWith(block, ore);
            expect(reg.resolve(Entry, "stone")).toStrictEqual([block, ore]);
        });
    });

    describe("matches()", () => {
        const dirt = new Leaf("dirt");
        let reg: Registry;
        beforeAll(async () => {
            reg = await registryWith(dirt);
        });

        test("compares identifiers ignoring this registry's namespace", () => {
            expect(reg.matches({ ctor: Leaf, target: `${NS}:dirt` }, "dirt")).toBe(true);
            expect(reg.matches({ ctor: Leaf, target: "dirt" }, `${NS}:dirt`)).toBe(true);
            expect(reg.matches({ ctor: Leaf, target: "other:dirt" }, "dirt")).toBe(false);
        });

        test("compares definitions by identifier", () => {
            expect(reg.matches({ ctor: Leaf, target: dirt }, `${NS}:dirt`)).toBe(true);
            expect(reg.matches({ ctor: Leaf, target: new Leaf("dirt") }, dirt)).toBe(true);
        });

        test("checks classes against registered definitions", () => {
            expect(reg.matches({ ctor: Leaf, target: `${NS}:dirt` }, Leaf)).toBe(true);
            expect(reg.matches({ ctor: Leaf, target: dirt }, Leaf)).toBe(true);
            expect(reg.matches({ ctor: Leaf, target: `${NS}:dirt` }, Branch)).toBe(false);
            expect(reg.matches({ ctor: Leaf, target: "minecraft:stone" }, Leaf)).toBe(false);
        });

        test("rejects definitions of another kind with the same identifier", async () => {
            const ore = new Node("thing");
            const reg = await registryWith(new Leaf("thing"), ore);
            expect(reg.matches({ ctor: Leaf, target: `${NS}:thing` }, ore)).toBe(false);
            expect(reg.matches({ ctor: Leaf, target: `${NS}:thing` }, Branch)).toBe(false);
            expect(reg.matches({ ctor: Branch, target: `${NS}:thing` }, Node)).toBe(true);
        });
    });

    describe("isReferenced()", () => {
        test("detects references by instance or identifier", async () => {
            const byInstance = new Node("by_instance");
            const byId = new Node("by_id");
            const unused = new Node("unused");
            const reg = await registryWith(
                new Node("scatter", { links: [byInstance] }),
                new Node("rules", { links: [`${NS}:by_id`] }),
                byId,
                unused,
            );
            expect(reg.isReferenced(byInstance)).toBe(true);
            expect(reg.isReferenced(byId)).toBe(true);
            expect(reg.isReferenced(unused)).toBe(false);
        });

        test("ignores references to another kind with the same identifier", async () => {
            const block = new Leaf("thing");
            const ore = new Node("thing", { leaves: [`${NS}:thing`] });
            const reg = await registryWith(block, ore);
            expect(reg.isReferenced(block)).toBe(true);
            expect(reg.isReferenced(ore)).toBe(false);
        });

        test("ignores references from other namespaces", async () => {
            const ore = new Node("ore");
            const reg = await registryWith(ore, new Node("rules", { links: ["other:ore"] }));
            expect(reg.isReferenced(ore)).toBe(false);
        });

        test("updates after adding and removing", async () => {
            const ore = new Node("ore");
            const rules = new Node("rules", { links: [`${NS}:ore`] });
            await inSystem((reg) => {
                expect(reg.isReferenced(ore)).toBe(false);
                reg.add(rules);
                expect(reg.isReferenced(ore)).toBe(true);
                reg.remove(rules);
                expect(reg.isReferenced(ore)).toBe(false);
            }, ore);
        });

        test("updates between systems that mutate definitions", async () => {
            const ore = new Node("ore");
            const rules = new Node("rules", { links: [`${NS}:ore`] });
            const seen: boolean[] = [];
            await runSetup(
                NS,
                (reg) => {
                    reg.add(ore, rules);
                },
                (reg) => {
                    seen.push(reg.isReferenced(ore));
                    rules.links = [`${NS}:elsewhere`];
                },
                (reg) => {
                    seen.push(reg.isReferenced(ore));
                },
            );
            expect(seen).toStrictEqual([true, false]);
        });
    });
});

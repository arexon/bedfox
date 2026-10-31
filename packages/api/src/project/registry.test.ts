import { setTimeout as delay } from "node:timers/promises";

import { beforeAll, describe, expect, test } from "vite-plus/test";

import { Block } from "#/block/index";
import { Definition, type DefinitionLocation } from "#/core/definition";
import type { Emitted, PackKind } from "#/core/output";
import { Resource } from "#/core/resource";
import { Feature } from "#/feature/base";
import { OreFeature } from "#/feature/ore";
import { FeatureRules } from "#/feature/rules";
import { ScatterFeature } from "#/feature/scatter";
import { SequenceFeature } from "#/feature/sequence";
import { FormatVersion } from "#/primitive/index";
import { DuplicatePathError, type Registry, RegistryClosedError } from "#/project/index";
import { serialize } from "#/serialize";
import { ids, NS, registryWith, runSetup } from "#/test/helpers";

@serialize
class Custom extends Definition {
    static override readonly defaultFormatVersion = new FormatVersion(1, 0, 0);
    static override readonly location: DefinitionLocation = { kind: "behavior", folder: "custom" };

    @serialize({ within: ["test:custom", "description"] })
    override readonly identifier: string;

    constructor(identifier: string) {
        super(identifier);
        this.identifier = identifier;
    }
}

class Notes extends Resource {
    lines: string[] = [];

    get kind(): PackKind {
        return "resource";
    }

    get path(): string {
        return "notes.txt";
    }

    emit(): Emitted {
        return { text: this.lines.join("\n") };
    }

    override isEmpty(): boolean {
        return this.lines.length === 0;
    }
}

class Clash extends Resource {
    get kind(): PackKind {
        return "behavior";
    }

    get path(): string {
        return "custom/clash.json";
    }

    emit(): Emitted {
        return { json: {} };
    }
}

async function inSystem<T>(fn: (reg: Registry) => T, ...defs: Definition[]): Promise<T> {
    const result = Promise.withResolvers<T>();
    await runSetup(
        NS,
        (reg) => {
            reg.add(...defs);
        },
        (reg) => result.resolve(fn(reg)),
    );
    return result.promise;
}

describe("Registry", () => {
    describe("add()", () => {
        test("registers definitions and chains", async () => {
            const block = new Block("dirt");
            await inSystem((reg) => {
                expect(reg.add(block)).toBe(reg);
                expect([...reg.entries()]).toStrictEqual([block]);
            });
        });

        test("ignores the same instance added twice", async () => {
            const block = new Block("dirt");
            const reg = await inSystem((reg) => reg.add(block).add(block));
            expect([...reg.entries()]).toStrictEqual([block]);
        });

        test("rejects another definition written to the same file", async () => {
            const reg = await inSystem(
                (reg) => {
                    expect(() => reg.add(new Block("dirt"))).toThrow(
                        expect.objectContaining({
                            name: "DuplicatePathError",
                            message:
                                "Can't add Block dirt, Block dirt is already written to blocks/dirt.json in the behavior pack",
                        }),
                    );
                    expect(() => reg.add(new ScatterFeature("ore"))).toThrow(DuplicatePathError);
                    return reg;
                },
                new Block("dirt"),
                new OreFeature("ore"),
            );
            expect([...reg.entries()].length).toBe(2);
        });

        test("accepts a definition at a file freed by a removal", async () => {
            const dirt = new Block("dirt");
            const reg = await inSystem((reg) => {
                reg.remove(...reg.entries());
                return reg.add(dirt);
            }, new Block("dirt"));
            expect([...reg.entries()]).toStrictEqual([dirt]);
        });

        test("allows the same identifier across kinds", async () => {
            const reg = await registryWith(
                new Block("thing"),
                new OreFeature("thing"),
                new FeatureRules("thing", { placesFeature: `${NS}:thing` }),
            );
            expect([...reg.entries()].length).toBe(3);
        });

        test("accepts a definition that another project holds", async () => {
            const dirt = new Block("dirt");
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
            const ore = new OreFeature("ore");
            const scatter = new ScatterFeature("scatter", { placesFeature: ore });
            const rules = new FeatureRules("rules", { placesFeature: scatter });
            const reg = await registryWith(rules);
            expect(ids(reg.entries())).toStrictEqual(["rules", "scatter", "ore"]);
        });

        test("registers reference cycles", async () => {
            const a = new SequenceFeature("a", { features: [] });
            a.features.push(new SequenceFeature("b", { features: [a] }));
            expect(ids((await registryWith(a)).entries())).toStrictEqual(["a", "b"]);
        });

        test("unregisters a definition whose references are rejected", async () => {
            const scatter = new ScatterFeature("scatter", { placesFeature: new OreFeature("ore") });
            const reg = await inSystem((reg) => {
                expect(() => reg.add(scatter)).toThrow(DuplicatePathError);
                return reg;
            }, new OreFeature("ore"));
            expect(ids(reg.entries())).toStrictEqual(["ore"]);
        });

        test("unregisters the whole tree when a nested reference is rejected", async () => {
            const okOre = new OreFeature("ok_ore");
            const seq = new SequenceFeature("seq", {
                features: [okOre, new OreFeature("dup_ore")],
            });
            const scatter = new ScatterFeature("scatter", { placesFeature: seq });
            const reg = await inSystem((reg) => {
                expect(() => reg.add(scatter)).toThrow(DuplicatePathError);
                return reg;
            }, new OreFeature("dup_ore"));
            expect(ids(reg.entries())).toStrictEqual(["dup_ore"]);
        });

        test("unregisters earlier arguments when a later one is rejected", async () => {
            const dirt = new Block("dirt");
            const reg = await inSystem((reg) => {
                expect(() => reg.add(dirt, new Block("stone"))).toThrow(DuplicatePathError);
                return reg;
            }, new Block("stone"));
            expect(ids(reg.entries())).toStrictEqual(["stone"]);
        });

        test("keeps definitions registered before a rejected add", async () => {
            const shared = new OreFeature("shared");
            const scatter = new ScatterFeature("scatter", { placesFeature: shared });
            const seq = new SequenceFeature("seq", {
                features: [shared, new OreFeature("dup_ore")],
            });
            const reg = await inSystem(
                (reg) => {
                    expect(() => reg.add(seq)).toThrow(DuplicatePathError);
                    return reg;
                },
                scatter,
                new OreFeature("dup_ore"),
            );
            expect(ids(reg.entries())).toStrictEqual(["scatter", "shared", "dup_ore"]);
        });

        test("does not register string references", async () => {
            const reg = await registryWith(
                new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
            );
            expect(ids(reg.entries())).toStrictEqual(["scatter"]);
        });
    });

    describe("remove()", () => {
        test("unregisters definitions", async () => {
            const dirt = new Block("dirt");
            const stone = new Block("stone");
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
            const dirt = new Block("dirt");
            const reg = await inSystem((reg) => {
                reg.remove(new Block("dirt"));
                return reg;
            }, dirt);
            expect([...reg.entries()]).toStrictEqual([dirt]);
        });
    });

    describe("after its run", () => {
        test("rejects add() and remove()", async () => {
            const dirt = new Block("dirt");
            const reg = await registryWith(dirt);
            expect(() => reg.add(new Block("stone"))).toThrow(
                expect.objectContaining({
                    name: "RegistryClosedError",
                    message:
                        "Can't change a registry after its run ended. A system may have kept the registry, or changed it from async work",
                }),
            );
            expect(() => reg.remove(dirt)).toThrow(RegistryClosedError);
            expect([...reg.entries()]).toStrictEqual([dirt]);
        });

        test("rejects changes from a system's async work", async () => {
            const late: Promise<unknown>[] = [];
            await runSetup(NS, (reg) => {
                late.push(delay(1).then(() => reg.add(new Block("dirt"))));
            });
            await expect(late[0]).rejects.toThrow(RegistryClosedError);
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

        test("rejects a path that another file in the pack has", async () => {
            await inSystem((reg) => {
                reg.add(new Custom("clash"));
                expect(() => reg.resource(Clash)).toThrow(
                    expect.objectContaining({
                        name: "DuplicatePathError",
                        message:
                            "Can't add Clash, Custom clash is already written to custom/clash.json in the behavior pack",
                    }),
                );
            });
            await inSystem((reg) => {
                reg.resource(Clash);
                expect(() => reg.add(new Custom("clash"))).toThrow(DuplicatePathError);
            });
        });

        test("after its run, returns existing resources and rejects new ones", async () => {
            const reg = await runSetup(NS, (reg) => {
                reg.resource(Notes);
            });
            expect(reg.resource(Notes)).toBeInstanceOf(Notes);
            expect(() => reg.resource(Clash)).toThrow(RegistryClosedError);
        });
    });

    describe("outputs()", () => {
        test("yields resources that aren't empty in creation order, then entries", async () => {
            const dirt = new Block("dirt");
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
                new FeatureRules("rules", { placesFeature: `${NS}:b_ore` }),
                new OreFeature("b_ore"),
                new Block("b_block"),
                new OreFeature("a_ore"),
                new Block("a_block"),
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
        const dirt = new Block("dirt");
        const ore = new OreFeature("ore");
        let reg: Registry;
        beforeAll(async () => {
            reg = await registryWith(dirt, ore);
        });

        test("finds a definition by class and identifier", () => {
            expect(reg.resolve(Block, "dirt")).toStrictEqual([dirt]);
        });

        test("strips this registry's namespace", () => {
            expect(reg.resolve(Block, `${NS}:dirt`)).toStrictEqual([dirt]);
        });

        test("matches base classes", () => {
            expect(reg.resolve(Feature, "ore")).toStrictEqual([ore]);
            expect(reg.resolve(Definition, "dirt")).toStrictEqual([dirt]);
        });

        test("misses other classes", () => {
            expect(reg.resolve(Block, "ore")).toStrictEqual([]);
            expect(reg.resolve(ScatterFeature, "ore")).toStrictEqual([]);
        });

        test("misses unknown identifiers and other namespaces", () => {
            expect(reg.resolve(Block, "stone")).toStrictEqual([]);
            expect(reg.resolve(Block, "other:dirt")).toStrictEqual([]);
        });

        test("finds every kind sharing an identifier, in the order they were added", async () => {
            const block = new Block("stone");
            const ore = new OreFeature("stone");
            const reg = await registryWith(block, ore);
            expect(reg.resolve(Definition, "stone")).toStrictEqual([block, ore]);
        });
    });

    describe("matches()", () => {
        const dirt = new Block("dirt");
        let reg: Registry;
        beforeAll(async () => {
            reg = await registryWith(dirt);
        });

        test("compares identifiers ignoring this registry's namespace", () => {
            expect(reg.matches({ ctor: Block, target: `${NS}:dirt` }, "dirt")).toBe(true);
            expect(reg.matches({ ctor: Block, target: "dirt" }, `${NS}:dirt`)).toBe(true);
            expect(reg.matches({ ctor: Block, target: "other:dirt" }, "dirt")).toBe(false);
        });

        test("compares definitions by identifier", () => {
            expect(reg.matches({ ctor: Block, target: dirt }, `${NS}:dirt`)).toBe(true);
            expect(reg.matches({ ctor: Block, target: new Block("dirt") }, dirt)).toBe(true);
        });

        test("checks classes against registered definitions", () => {
            expect(reg.matches({ ctor: Block, target: `${NS}:dirt` }, Block)).toBe(true);
            expect(reg.matches({ ctor: Block, target: dirt }, Block)).toBe(true);
            expect(reg.matches({ ctor: Block, target: `${NS}:dirt` }, Feature)).toBe(false);
            expect(reg.matches({ ctor: Block, target: "minecraft:stone" }, Block)).toBe(false);
        });

        test("rejects definitions of another kind with the same identifier", async () => {
            const ore = new OreFeature("thing");
            const reg = await registryWith(new Block("thing"), ore);
            expect(reg.matches({ ctor: Block, target: `${NS}:thing` }, ore)).toBe(false);
            expect(reg.matches({ ctor: Block, target: `${NS}:thing` }, Feature)).toBe(false);
            expect(reg.matches({ ctor: Feature, target: `${NS}:thing` }, OreFeature)).toBe(true);
        });
    });

    describe("isReferenced()", () => {
        test("detects references by instance or identifier", async () => {
            const byInstance = new OreFeature("by_instance");
            const byId = new OreFeature("by_id");
            const unused = new OreFeature("unused");
            const reg = await registryWith(
                new ScatterFeature("scatter", { placesFeature: byInstance }),
                new FeatureRules("rules", { placesFeature: `${NS}:by_id` }),
                byId,
                unused,
            );
            expect(reg.isReferenced(byInstance)).toBe(true);
            expect(reg.isReferenced(byId)).toBe(true);
            expect(reg.isReferenced(unused)).toBe(false);
        });

        test("ignores references to another kind with the same identifier", async () => {
            const block = new Block("thing");
            const ore = new OreFeature("thing").add(`${NS}:thing`, ["minecraft:stone"]);
            const reg = await registryWith(block, ore);
            expect(reg.isReferenced(block)).toBe(true);
            expect(reg.isReferenced(ore)).toBe(false);
        });

        test("ignores references from other namespaces", async () => {
            const ore = new OreFeature("ore");
            const reg = await registryWith(
                ore,
                new FeatureRules("rules", { placesFeature: "other:ore" }),
            );
            expect(reg.isReferenced(ore)).toBe(false);
        });

        test("updates after adding and removing", async () => {
            const ore = new OreFeature("ore");
            const rules = new FeatureRules("rules", { placesFeature: `${NS}:ore` });
            await inSystem((reg) => {
                expect(reg.isReferenced(ore)).toBe(false);
                reg.add(rules);
                expect(reg.isReferenced(ore)).toBe(true);
                reg.remove(rules);
                expect(reg.isReferenced(ore)).toBe(false);
            }, ore);
        });

        test("updates between systems that mutate definitions", async () => {
            const ore = new OreFeature("ore");
            const rules = new FeatureRules("rules", { placesFeature: `${NS}:ore` });
            const seen: boolean[] = [];
            await runSetup(
                NS,
                (reg) => {
                    reg.add(ore, rules);
                },
                (reg) => {
                    seen.push(reg.isReferenced(ore));
                    rules.placesFeature = `${NS}:elsewhere`;
                },
                (reg) => {
                    seen.push(reg.isReferenced(ore));
                },
            );
            expect(seen).toStrictEqual([true, false]);
        });
    });
});

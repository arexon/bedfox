import { setTimeout as delay } from "node:timers/promises";

import { beforeAll, describe, expect, test } from "vite-plus/test";

import { Block } from "#/block/index";
import { Definition, type DefinitionLocation } from "#/core/definition";
import { Feature } from "#/feature/base";
import { OreFeature } from "#/feature/ore";
import { FeatureRules } from "#/feature/rules";
import { ScatterFeature } from "#/feature/scatter";
import { SequenceFeature } from "#/feature/sequence";
import { ScriptModule } from "#/manifest/index";
import { FormatVersion } from "#/primitive/index";
import {
    DuplicateIdentifierError,
    type PreparedSystem,
    Project,
    type Registry,
    RegistryClosedError,
    type System,
    SystemFailedError,
} from "#/project/index";
import { serialize } from "#/serialize";

const NS = "test";

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

function json(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
}

function ids(defs: Iterable<Definition>): string[] {
    return Array.from(defs, (def) => def.identifier);
}

async function runSetup(
    namespace: string,
    ...systems: (System | PreparedSystem<unknown>)[]
): Promise<Registry> {
    const registry = Promise.withResolvers<Registry>();
    const project = new Project({ namespace }).addSystem("setup", registry.resolve, ...systems);
    try {
        await project.run();
    } catch (error) {
        throw error instanceof SystemFailedError ? error.cause : error;
    }
    return registry.promise;
}

function registryWith(...defs: Definition[]): Promise<Registry> {
    return runSetup(NS, (reg) => {
        reg.add(...defs);
    });
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
                expect([...reg.all()]).toStrictEqual([block]);
            });
        });

        test("ignores the same instance added twice", async () => {
            const block = new Block("dirt");
            const reg = await inSystem((reg) => reg.add(block).add(block));
            expect([...reg.all()]).toStrictEqual([block]);
        });

        test("rejects another definition written to the same file", async () => {
            const reg = await inSystem(
                (reg) => {
                    expect(() => reg.add(new Block("dirt"))).toThrow(
                        expect.objectContaining({
                            name: "DuplicateIdentifierError",
                            message:
                                "Can't add Block dirt, Block dirt is already written to blocks/dirt.json in the behavior pack",
                        }),
                    );
                    expect(() => reg.add(new ScatterFeature("ore"))).toThrow(
                        DuplicateIdentifierError,
                    );
                    return reg;
                },
                new Block("dirt"),
                new OreFeature("ore"),
            );
            expect([...reg.all()].length).toBe(2);
        });

        test("accepts a definition at a file freed by a removal", async () => {
            const dirt = new Block("dirt");
            const reg = await inSystem((reg) => {
                reg.remove(...reg.all());
                return reg.add(dirt);
            }, new Block("dirt"));
            expect([...reg.all()]).toStrictEqual([dirt]);
        });

        test("allows the same identifier across kinds", async () => {
            const reg = await registryWith(
                new Block("thing"),
                new OreFeature("thing"),
                new FeatureRules("thing", { placesFeature: `${NS}:thing` }),
            );
            expect([...reg.all()].length).toBe(3);
        });

        test("registers any definition kind", async () => {
            const custom = new Custom("custom");
            expect([...(await registryWith(custom)).all()]).toStrictEqual([custom]);
        });

        test("rejects a definition in another project, even with the same namespace", async () => {
            const dirt = new Block("dirt");
            await registryWith(dirt);
            await expect(registryWith(dirt)).rejects.toThrow(
                expect.objectContaining({
                    name: "AlreadyRegisteredError",
                    message: `Definition dirt is already in a ${NS} registry of another project. Create definitions inside systems, so that each project makes its own`,
                }),
            );
        });

        test("registers nested definition instances", async () => {
            const ore = new OreFeature("ore");
            const scatter = new ScatterFeature("scatter", { placesFeature: ore });
            const rules = new FeatureRules("rules", { placesFeature: scatter });
            const reg = await registryWith(rules);
            expect(ids(reg.all())).toStrictEqual(["rules", "scatter", "ore"]);
        });

        test("registers reference cycles", async () => {
            const a = new SequenceFeature("a", { features: [] });
            a.features.push(new SequenceFeature("b", { features: [a] }));
            expect(ids((await registryWith(a)).all())).toStrictEqual(["a", "b"]);
        });

        test("unregisters a definition whose references are rejected", async () => {
            const scatter = new ScatterFeature("scatter", { placesFeature: new OreFeature("ore") });
            const reg = await inSystem((reg) => {
                expect(() => reg.add(scatter)).toThrow(DuplicateIdentifierError);
                return reg;
            }, new OreFeature("ore"));
            expect(ids(reg.all())).toStrictEqual(["ore"]);
            expect(scatter.qualifiedIdentifier).toBe("scatter");
        });

        test("unregisters the whole tree when a nested reference is rejected", async () => {
            const okOre = new OreFeature("ok_ore");
            const seq = new SequenceFeature("seq", {
                features: [okOre, new OreFeature("dup_ore")],
            });
            const scatter = new ScatterFeature("scatter", { placesFeature: seq });
            const reg = await inSystem((reg) => {
                expect(() => reg.add(scatter)).toThrow(DuplicateIdentifierError);
                return reg;
            }, new OreFeature("dup_ore"));
            expect(ids(reg.all())).toStrictEqual(["dup_ore"]);
            expect(okOre.qualifiedIdentifier).toBe("ok_ore");
            expect(seq.qualifiedIdentifier).toBe("seq");
        });

        test("unregisters earlier arguments when a later one is rejected", async () => {
            const dirt = new Block("dirt");
            const reg = await inSystem((reg) => {
                expect(() => reg.add(dirt, new Block("stone"))).toThrow(DuplicateIdentifierError);
                return reg;
            }, new Block("stone"));
            expect(ids(reg.all())).toStrictEqual(["stone"]);
            expect(dirt.qualifiedIdentifier).toBe("dirt");
        });

        test("keeps definitions registered before a rejected add", async () => {
            const shared = new OreFeature("shared");
            const scatter = new ScatterFeature("scatter", { placesFeature: shared });
            const seq = new SequenceFeature("seq", {
                features: [shared, new OreFeature("dup_ore")],
            });
            const reg = await inSystem(
                (reg) => {
                    expect(() => reg.add(seq)).toThrow(DuplicateIdentifierError);
                    return reg;
                },
                scatter,
                new OreFeature("dup_ore"),
            );
            expect(ids(reg.all())).toStrictEqual(["scatter", "shared", "dup_ore"]);
            expect(shared.qualifiedIdentifier).toBe(`${NS}:shared`);
        });

        test("does not register string references", async () => {
            const reg = await registryWith(
                new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
            );
            expect(ids(reg.all())).toStrictEqual(["scatter"]);
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
            expect([...reg.all()]).toStrictEqual([stone]);
        });

        test("ignores another instance with the same identifier", async () => {
            const dirt = new Block("dirt");
            const reg = await inSystem((reg) => {
                reg.remove(new Block("dirt"));
                return reg;
            }, dirt);
            expect([...reg.all()]).toStrictEqual([dirt]);
        });

        test("lets another project add the definition", async () => {
            const dirt = new Block("dirt");
            await inSystem((reg) => reg.remove(dirt), dirt);
            await runSetup("other", (reg) => {
                reg.add(dirt);
            });
            expect(dirt.qualifiedIdentifier).toBe("other:dirt");
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
            expect([...reg.all()]).toStrictEqual([dirt]);
        });

        test("rejects changes from a system's async work", async () => {
            const late: Promise<unknown>[] = [];
            await runSetup(NS, (reg) => {
                late.push(delay(1).then(() => reg.add(new Block("dirt"))));
            });
            await expect(late[0]).rejects.toThrow(RegistryClosedError);
        });
    });

    describe("namespaces", () => {
        test("qualify registered definitions", async () => {
            const dirt = new Block("dirt");
            await registryWith(dirt);
            expect(dirt.qualifiedIdentifier).toBe(`${NS}:dirt`);
            expect(json(dirt)).toStrictEqual({
                format_version: "1.26.40",
                "minecraft:block": { description: { identifier: `${NS}:dirt` } },
            });
        });

        test("qualify references to instances registered through them", async () => {
            const ore = new OreFeature("ore");
            await registryWith(new ScatterFeature("scatter", { placesFeature: ore }));
            const scatter = new ScatterFeature("other", { placesFeature: ore });
            expect(ore.qualifiedIdentifier).toBe(`${NS}:ore`);
            expect(json(scatter)).toStrictEqual({
                format_version: "1.26.50",
                "minecraft:scatter_feature": {
                    description: { identifier: "other" },
                    places_feature: `${NS}:ore`,
                },
            });
        });

        test("leave string references as written", async () => {
            const scatter = new ScatterFeature("scatter", { placesFeature: "other:ore" });
            await registryWith(scatter);
            expect(json(scatter)).toStrictEqual({
                format_version: "1.26.50",
                "minecraft:scatter_feature": {
                    description: { identifier: `${NS}:scatter` },
                    places_feature: "other:ore",
                },
            });
        });

        test("leave unregistered definitions as written", () => {
            const dirt = new Block("dirt");
            expect(dirt.qualifiedIdentifier).toBe("dirt");
        });

        test("are cleared by remove()", async () => {
            const dirt = new Block("dirt");
            await inSystem((reg) => reg.remove(dirt), dirt);
            expect(dirt.qualifiedIdentifier).toBe("dirt");
        });

        test("stay when remove() ignores another instance", async () => {
            const other = new Block("dirt");
            await runSetup("other", (reg) => {
                reg.add(other);
            });
            await inSystem((reg) => reg.remove(other), new Block("dirt"));
            expect(other.qualifiedIdentifier).toBe("other:dirt");
        });
    });

    describe("manifests", () => {
        test("are a behavior and a resource pack for the namespace", async () => {
            const { bp, rp } = (await registryWith()).manifests;
            expect([bp.namespace, bp.kind]).toStrictEqual([NS, "behavior"]);
            expect([rp.namespace, rp.kind]).toStrictEqual([NS, "resource"]);
        });

        test("make the behavior pack depend on the resource pack", async () => {
            const { bp, rp } = (await registryWith()).manifests;
            const rpUuid = "220a205f-0cf8-57cd-8ca3-b3a714e93a44";
            expect(JSON.stringify(rp)).toContain(`"uuid":"${rpUuid}"`);
            expect(JSON.stringify(bp)).toContain(
                `"dependencies":[{"uuid":"${rpUuid}","version":"1.0.0"}]`,
            );
        });

        test("can be edited by systems", async () => {
            const reg = await runSetup(NS, (reg) => {
                reg.manifests.bp.module(new ScriptModule("scripts/main.js"));
            });
            expect(JSON.stringify(reg.manifests.bp)).toContain('"entry":"scripts/main.js"');
        });
    });

    describe("all()", () => {
        test("yields definitions in the order they were added", async () => {
            const reg = await registryWith(
                new FeatureRules("rules", { placesFeature: `${NS}:b_ore` }),
                new OreFeature("b_ore"),
                new Block("b_block"),
                new OreFeature("a_ore"),
                new Block("a_block"),
            );
            expect(ids(reg.all())).toStrictEqual(["rules", "b_ore", "b_block", "a_ore", "a_block"]);
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

        test("compares definitions and descriptors by identifier", () => {
            expect(reg.matches({ ctor: Block, target: dirt }, `${NS}:dirt`)).toBe(true);
            expect(reg.matches({ ctor: Block, target: { name: `${NS}:dirt` } }, dirt)).toBe(true);
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

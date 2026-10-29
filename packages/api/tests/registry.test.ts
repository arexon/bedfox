import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, test } from "vite-plus/test";

import {
    Block,
    FrictionBlockComponent,
    GeometryBlockComponent,
    LightEmissionBlockComponent,
} from "#/block/index";
import { Definition, type DefinitionLocation } from "#/core/index";
import {
    Feature,
    FeatureRules,
    OreFeature,
    ScatterFeature,
    SequenceFeature,
} from "#/feature/index";
import { ScriptModule } from "#/manifest/index";
import { FormatVersion } from "#/primitive/index";
import {
    AlreadyRegisteredError,
    DuplicateIdentifierError,
    type Query,
    query,
    Registry,
} from "#/registry/index";
import { serialize, TO_REFERENCE } from "#/serialize";

const NS = "test";

const OPTIONS = { namespace: NS } as const;

/** A definition kind bedfox doesn't ship. */
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

function ids(defs: Iterable<Definition>): string[] {
    return Array.from(defs, (def) => def.identifier);
}

async function collect<T extends Definition>(reg: Registry, q: Query<T>): Promise<string[]> {
    let result: string[] = [];
    await reg.addSystem(q.intoSystem((_, defs) => (result = ids(defs)))).run();
    return result;
}

describe(Registry.name, () => {
    describe("add()", () => {
        test("registers definitions and chains", () => {
            const reg = new Registry(OPTIONS);
            const block = new Block("dirt");
            expect(reg.add(block)).toBe(reg);
            expect([...reg.all()]).toStrictEqual([block]);
        });

        test("ignores the same instance added twice", () => {
            const block = new Block("dirt");
            const reg = new Registry(OPTIONS).add(block).add(block);
            expect([...reg.all()]).toStrictEqual([block]);
        });

        test("rejects another definition written to the same file", () => {
            const reg = new Registry(OPTIONS).add(new Block("dirt"), new OreFeature("ore"));
            expect(() => reg.add(new Block("dirt"))).toThrow(
                expect.objectContaining({
                    name: "DuplicateIdentifierError",
                    message:
                        "Can't add Block dirt, Block dirt is already written to blocks/dirt.json in the behavior pack",
                }),
            );
            expect(() => reg.add(new ScatterFeature("ore"))).toThrow(DuplicateIdentifierError);
            expect([...reg.all()].length).toBe(2);
        });

        test("accepts a definition at a file freed by a removal", () => {
            const reg = new Registry(OPTIONS).add(new Block("dirt"));
            reg.remove(...reg.all());
            const dirt = new Block("dirt");
            reg.add(dirt);
            expect([...reg.all()]).toStrictEqual([dirt]);
        });

        test("allows the same identifier across kinds", () => {
            const reg = new Registry(OPTIONS).add(
                new Block("thing"),
                new OreFeature("thing"),
                new FeatureRules("thing", { placesFeature: `${NS}:thing` }),
            );
            expect([...reg.all()].length).toBe(3);
        });

        test("registers any definition kind", () => {
            const custom = new Custom("custom");
            expect([...new Registry(OPTIONS).add(custom).all()]).toStrictEqual([custom]);
        });

        test("rejects a definition in another registry, even with the same namespace", () => {
            const dirt = new Block("dirt");
            new Registry(OPTIONS).add(dirt);
            expect(() => new Registry(OPTIONS).add(dirt)).toThrow(AlreadyRegisteredError);
        });

        test("registers nested definition instances", () => {
            const ore = new OreFeature("ore");
            const scatter = new ScatterFeature("scatter", { placesFeature: ore });
            const rules = new FeatureRules("rules", { placesFeature: scatter });
            const reg = new Registry(OPTIONS).add(rules);
            expect(ids(reg.all())).toStrictEqual(["rules", "scatter", "ore"]);
        });

        test("registers reference cycles", () => {
            const a = new SequenceFeature("a", { features: [] });
            a.features.push(new SequenceFeature("b", { features: [a] }));
            expect(ids(new Registry(OPTIONS).add(a).all())).toStrictEqual(["a", "b"]);
        });

        test("unregisters a definition whose references are rejected", () => {
            const reg = new Registry(OPTIONS).add(new OreFeature("ore"));
            const scatter = new ScatterFeature("scatter", { placesFeature: new OreFeature("ore") });
            expect(() => reg.add(scatter)).toThrow(DuplicateIdentifierError);
            expect(ids(reg.all())).toStrictEqual(["ore"]);
            expect(scatter.qualifiedIdentifier).toBe("scatter");
        });

        test("does not register string references", () => {
            const reg = new Registry(OPTIONS).add(
                new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
            );
            expect(ids(reg.all())).toStrictEqual(["scatter"]);
        });
    });

    describe("remove()", () => {
        test("unregisters definitions", () => {
            const dirt = new Block("dirt");
            const stone = new Block("stone");
            const reg = new Registry(OPTIONS).add(dirt, stone);
            reg.remove(dirt);
            expect([...reg.all()]).toStrictEqual([stone]);
        });

        test("ignores another instance with the same identifier", () => {
            const dirt = new Block("dirt");
            const reg = new Registry(OPTIONS).add(dirt);
            reg.remove(new Block("dirt"));
            expect([...reg.all()]).toStrictEqual([dirt]);
        });

        test("lets the definition be added to another registry", () => {
            const dirt = new Block("dirt");
            new Registry(OPTIONS).add(dirt).remove(dirt);
            new Registry({ ...OPTIONS, namespace: "other" }).add(dirt);
            expect(dirt.qualifiedIdentifier).toBe("other:dirt");
        });
    });

    describe("namespaces", () => {
        test("qualify registered definitions", () => {
            const dirt = new Block("dirt");
            new Registry(OPTIONS).add(dirt);
            expect(dirt.qualifiedIdentifier).toBe(`${NS}:dirt`);
            expect(JSON.stringify(dirt)).toBe(
                `{"format_version":"1.26.40","minecraft:block":{"description":{"identifier":"${NS}:dirt"}}}`,
            );
        });

        test("qualify references to instances registered through them", () => {
            const ore = new OreFeature("ore");
            new Registry(OPTIONS).add(new ScatterFeature("scatter", { placesFeature: ore }));
            const scatter = new ScatterFeature("other", { placesFeature: ore });
            expect(ore.qualifiedIdentifier).toBe(`${NS}:ore`);
            expect(JSON.stringify(scatter)).toBe(
                `{"format_version":"1.26.50","minecraft:scatter_feature":{"description":{"identifier":"other"},"places_feature":"${NS}:ore"}}`,
            );
        });

        test("leave string references as written", () => {
            const scatter = new ScatterFeature("scatter", { placesFeature: "other:ore" });
            new Registry(OPTIONS).add(scatter);
            expect(JSON.stringify(scatter)).toBe(
                `{"format_version":"1.26.50","minecraft:scatter_feature":{"description":{"identifier":"${NS}:scatter"},"places_feature":"other:ore"}}`,
            );
        });

        test("leave unregistered definitions as written", () => {
            const dirt = new Block("dirt");
            expect(dirt.qualifiedIdentifier).toBe("dirt");
            expect(dirt[TO_REFERENCE]()).toBe("dirt");
        });

        test("are cleared by remove()", () => {
            const dirt = new Block("dirt");
            new Registry(OPTIONS).add(dirt).remove(dirt);
            expect(dirt.qualifiedIdentifier).toBe("dirt");
            expect(() => new Registry({ ...OPTIONS, namespace: "other" }).add(dirt)).not.toThrow();
        });

        test("stay when remove() ignores another instance", () => {
            const dirt = new Block("dirt");
            const reg = new Registry(OPTIONS).add(dirt);
            const other = new Block("dirt");
            new Registry({ ...OPTIONS, namespace: "other" }).add(other);
            reg.remove(other);
            expect(other.qualifiedIdentifier).toBe("other:dirt");
        });
    });

    describe("manifests", () => {
        test("are derived from the namespace", () => {
            expect(new Registry(OPTIONS).manifests).toMatchSnapshot();
        });

        test("can be edited by systems", async () => {
            const reg = new Registry(OPTIONS).addSystem((reg) =>
                reg.manifests.bp.module(new ScriptModule("scripts/main.js")),
            );
            await reg.run();
            expect(reg.manifests.bp).toMatchSnapshot();
        });
    });

    describe("all()", () => {
        test("yields definitions in the order they were added", () => {
            const reg = new Registry(OPTIONS).add(
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
        const reg = new Registry(OPTIONS).add(dirt, ore);

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

        test("finds every kind sharing an identifier, in the order they were added", () => {
            const block = new Block("stone");
            const ore = new OreFeature("stone");
            const reg = new Registry(OPTIONS).add(block, ore);
            expect(reg.resolve(Definition, "stone")).toStrictEqual([block, ore]);
        });
    });

    describe("matches()", () => {
        const dirt = new Block("dirt");
        const reg = new Registry(OPTIONS).add(dirt);

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

        test("rejects definitions of another kind with the same identifier", () => {
            const ore = new OreFeature("thing");
            const reg = new Registry(OPTIONS).add(new Block("thing"), ore);
            expect(reg.matches({ ctor: Block, target: `${NS}:thing` }, ore)).toBe(false);
            expect(reg.matches({ ctor: Block, target: `${NS}:thing` }, Feature)).toBe(false);
            expect(reg.matches({ ctor: Feature, target: `${NS}:thing` }, OreFeature)).toBe(true);
        });
    });

    describe("isReferenced()", () => {
        test("detects references by instance or identifier", () => {
            const byInstance = new OreFeature("by_instance");
            const byId = new OreFeature("by_id");
            const unused = new OreFeature("unused");
            const reg = new Registry(OPTIONS).add(
                new ScatterFeature("scatter", { placesFeature: byInstance }),
                new FeatureRules("rules", { placesFeature: `${NS}:by_id` }),
                byId,
                unused,
            );
            expect(reg.isReferenced(byInstance)).toBe(true);
            expect(reg.isReferenced(byId)).toBe(true);
            expect(reg.isReferenced(unused)).toBe(false);
        });

        test("ignores references to another kind with the same identifier", () => {
            const block = new Block("thing");
            const ore = new OreFeature("thing").add(`${NS}:thing`, ["minecraft:stone"]);
            const reg = new Registry(OPTIONS).add(block, ore);
            expect(reg.isReferenced(block)).toBe(true);
            expect(reg.isReferenced(ore)).toBe(false);
        });

        test("ignores references from other namespaces", () => {
            const ore = new OreFeature("ore");
            const reg = new Registry(OPTIONS).add(
                ore,
                new FeatureRules("rules", { placesFeature: "other:ore" }),
            );
            expect(reg.isReferenced(ore)).toBe(false);
        });

        test("updates after adding and removing", () => {
            const ore = new OreFeature("ore");
            const rules = new FeatureRules("rules", { placesFeature: `${NS}:ore` });
            const reg = new Registry(OPTIONS).add(ore);
            expect(reg.isReferenced(ore)).toBe(false);
            reg.add(rules);
            expect(reg.isReferenced(ore)).toBe(true);
            reg.remove(rules);
            expect(reg.isReferenced(ore)).toBe(false);
        });

        test("updates between systems that mutate definitions", async () => {
            const ore = new OreFeature("ore");
            const rules = new FeatureRules("rules", { placesFeature: `${NS}:ore` });
            const seen: boolean[] = [];
            await new Registry(OPTIONS)
                .add(ore, rules)
                .addSystem(
                    (reg) => {
                        seen.push(reg.isReferenced(ore));
                        rules.placesFeature = `${NS}:elsewhere`;
                    },
                    (reg) => seen.push(reg.isReferenced(ore)),
                )
                .run();
            expect(seen).toStrictEqual([true, false]);
        });
    });

    describe("systems", () => {
        test("run setup, transform, finalize, then build, each in insertion order", async () => {
            const order: string[] = [];
            const push = (name: string) => () => order.push(name);
            const schedules = ["build", "finalize", "transform", "setup"] as const;
            const reg = new Registry(OPTIONS);
            for (const schedule of schedules) {
                reg.addSystem(schedule, push(`${schedule} 1`), push(`${schedule} 2`));
            }
            await reg.run();
            expect(order).toStrictEqual([
                "setup 1",
                "setup 2",
                "transform 1",
                "transform 2",
                "finalize 1",
                "finalize 2",
                "build 1",
                "build 2",
            ]);
        });

        test("default to transform", async () => {
            const order: string[] = [];
            await new Registry(OPTIONS)
                .addSystem("finalize", () => order.push("finalize"))
                .addSystem(() => order.push("default"))
                .addSystem("setup", () => order.push("setup"))
                .run();
            expect(order).toStrictEqual(["setup", "default", "finalize"]);
        });

        test("see definitions added by earlier systems", async () => {
            let found: Block[] = [];
            await new Registry(OPTIONS)
                .addSystem("setup", (reg) => reg.add(new Block("dirt")))
                .addSystem((reg) => (found = reg.resolve(Block, "dirt")))
                .run();
            expect(ids(found)).toStrictEqual(["dirt"]);
        });

        test("wait for async systems before running the next", async () => {
            const order: string[] = [];
            await new Registry(OPTIONS)
                .addSystem("setup", async () => {
                    await delay(5);
                    order.push("slow");
                })
                .addSystem("setup", () => order.push("next"))
                .run();
            expect(order).toStrictEqual(["slow", "next"]);
        });

        test("rerun on every run", async () => {
            let count = 0;
            const reg = new Registry(OPTIONS).addSystem(() => count++);
            await reg.run();
            await reg.run();
            expect(count).toBe(2);
        });
    });
});

describe(query.name, () => {
    test("yields definitions of the given classes in the order they were added", async () => {
        const reg = new Registry(OPTIONS).add(
            new FeatureRules("rules", { placesFeature: `${NS}:ore` }),
            new OreFeature("ore"),
            new Block("dirt"),
        );
        expect(await collect(reg, query(Block))).toStrictEqual(["dirt"]);
        expect(await collect(reg, query(FeatureRules, Block))).toStrictEqual(["rules", "dirt"]);
        expect(await collect(reg, query(Definition))).toStrictEqual(["rules", "ore", "dirt"]);
    });

    test("matches subclasses", async () => {
        const reg = new Registry(OPTIONS).add(
            new OreFeature("ore"),
            new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
        );
        expect(await collect(reg, query(Feature))).toStrictEqual(["ore", "scatter"]);
        expect(await collect(reg, query(ScatterFeature))).toStrictEqual(["scatter"]);
    });

    describe("intoSystem()", () => {
        test("skips the callback when nothing matches", async () => {
            let calls = 0;
            await new Registry(OPTIONS)
                .add(new OreFeature("ore"))
                .addSystem(query(Block).intoSystem(() => calls++))
                .run();
            expect(calls).toBe(0);
        });

        test("rechecks the first match when the callback reads it", async () => {
            const a = new OreFeature("a");
            const b = new OreFeature("b");
            let orphans: string[] = [];
            await new Registry(OPTIONS)
                .add(a, b)
                .addSystem(
                    query(Feature)
                        .orphan()
                        .intoSystem((reg, features) => {
                            reg.add(
                                new FeatureRules("rules_a", { placesFeature: a }),
                                new FeatureRules("rules_b", { placesFeature: b }),
                            );
                            orphans = ids(features);
                        }),
                )
                .run();
            expect(orphans).toStrictEqual([]);
        });

        test("drops the first match if the callback removes it", async () => {
            const a = new OreFeature("a");
            let features: string[] = [];
            await new Registry(OPTIONS)
                .add(a, new OreFeature("b"))
                .addSystem(
                    query(Feature).intoSystem((reg, defs) => {
                        reg.remove(a);
                        features = ids(defs);
                    }),
                )
                .run();
            expect(features).toStrictEqual(["b"]);
        });

        test("doesn't yield definitions added while iterating", async () => {
            const seen: string[] = [];
            const reg = new Registry(OPTIONS).add(new Block("oak")).addSystem(
                query(Block).intoSystem((reg, blocks) => {
                    for (const block of blocks) {
                        seen.push(block.identifier);
                        reg.add(new Block(`${block.identifier}_slab`));
                    }
                }),
            );
            await reg.run();
            expect(seen).toStrictEqual(["oak"]);
            expect(ids(reg.all())).toStrictEqual(["oak", "oak_slab"]);
        });

        test("allows removing definitions while iterating", async () => {
            const reg = new Registry(OPTIONS).add(new Block("a"), new Block("b"), new Block("c"));
            await reg
                .addSystem(
                    query(Block).intoSystem((r, blocks) => {
                        for (const block of blocks) r.remove(block);
                    }),
                )
                .run();
            expect([...reg.all()]).toStrictEqual([]);
        });
    });

    describe("filters", () => {
        test("filter() returns a new query", async () => {
            const reg = new Registry(OPTIONS).add(new Block("dirt"), new Block("stone"));
            const base = query(Block);
            const dirt = base.filter((block) => block.identifier === "dirt");
            const none = dirt.filter((block) => block.identifier === "stone");
            expect(await collect(reg, base)).toStrictEqual(["dirt", "stone"]);
            expect(await collect(reg, dirt)).toStrictEqual(["dirt"]);
            expect(await collect(reg, none)).toStrictEqual([]);
        });

        test("orphan()", async () => {
            const reg = new Registry(OPTIONS).add(
                new FeatureRules("rules", {
                    placesFeature: new ScatterFeature("scatter", {
                        placesFeature: new OreFeature("used"),
                    }),
                }),
                new OreFeature("unused"),
            );
            expect(await collect(reg, query(Feature).orphan())).toStrictEqual(["unused"]);
            expect(await collect(reg, query(Definition).orphan())).toStrictEqual([
                "rules",
                "unused",
            ]);
        });

        describe("withComponent() and withoutComponent()", () => {
            test("match blocks by their components", async () => {
                const plain = new Block("plain");
                const slippery = new Block("slippery");
                slippery.components.set(new FrictionBlockComponent(0.1));
                const glowing = new Block("glowing");
                glowing.components.set(
                    new FrictionBlockComponent(0.1),
                    new LightEmissionBlockComponent(15),
                );
                const reg = new Registry(OPTIONS).add(plain, slippery, glowing);

                const blocks = query(Block);
                expect(
                    await collect(reg, blocks.withComponent(FrictionBlockComponent)),
                ).toStrictEqual(["slippery", "glowing"]);
                expect(
                    await collect(
                        reg,
                        blocks.withComponent(FrictionBlockComponent, LightEmissionBlockComponent),
                    ),
                ).toStrictEqual(["glowing"]);
                expect(
                    await collect(reg, blocks.withoutComponent(LightEmissionBlockComponent)),
                ).toStrictEqual(["plain", "slippery"]);
                expect(
                    await collect(
                        reg,
                        blocks.withoutComponent(
                            FrictionBlockComponent,
                            LightEmissionBlockComponent,
                        ),
                    ),
                ).toStrictEqual(["plain"]);
            });

            test("only filter blocks", async () => {
                const slippery = new Block("slippery");
                slippery.components.set(new FrictionBlockComponent(0.1));
                const reg = new Registry(OPTIONS).add(
                    slippery,
                    new Block("plain"),
                    new OreFeature("ore"),
                );

                const defs = query(Definition);
                expect(
                    await collect(reg, defs.withComponent(FrictionBlockComponent)),
                ).toStrictEqual(["slippery", "ore"]);
                expect(
                    await collect(reg, defs.withoutComponent(FrictionBlockComponent)),
                ).toStrictEqual(["plain", "ore"]);
            });
        });

        describe("placing()", () => {
            test("on features", async () => {
                const dirt = new Block("dirt");
                const reg = new Registry(OPTIONS).add(
                    dirt,
                    new OreFeature("dirt_ore").add(`${NS}:dirt`, ["minecraft:stone"]),
                    new OreFeature("vanilla_ore").add("minecraft:stone", ["minecraft:deepslate"]),
                    new ScatterFeature("scatter", { placesFeature: `${NS}:dirt_ore` }),
                );
                const features = query(Feature);
                expect(await collect(reg, features.placing(dirt))).toStrictEqual(["dirt_ore"]);
                expect(await collect(reg, features.placing("minecraft:stone"))).toStrictEqual([
                    "vanilla_ore",
                ]);
                expect(await collect(reg, features.placing(Block))).toStrictEqual(["dirt_ore"]);
                expect(await collect(reg, features.placing(OreFeature))).toStrictEqual(["scatter"]);
            });

            test("on feature rules", async () => {
                const ore = new OreFeature("ore");
                const reg = new Registry(OPTIONS).add(
                    new FeatureRules("ore_rules", { placesFeature: ore }),
                    new FeatureRules("vanilla_rules", { placesFeature: "minecraft:ore" }),
                );
                const rules = query(FeatureRules);
                expect(await collect(reg, rules.placing(ore))).toStrictEqual(["ore_rules"]);
                expect(await collect(reg, rules.placing(`${NS}:ore`))).toStrictEqual(["ore_rules"]);
                expect(await collect(reg, rules.placing(OreFeature))).toStrictEqual(["ore_rules"]);
            });

            test("only filters features and feature rules", async () => {
                const ore = new OreFeature("ore");
                const reg = new Registry(OPTIONS).add(
                    new Block("dirt"),
                    new ScatterFeature("scatter", { placesFeature: ore }),
                    new ScatterFeature("elsewhere", { placesFeature: `${NS}:elsewhere` }),
                    new FeatureRules("rules", { placesFeature: ore }),
                );
                expect(await collect(reg, query(Definition).placing(ore))).toStrictEqual([
                    "dirt",
                    "scatter",
                    "rules",
                ]);
            });
        });

        test("kind filters can be mixed", async () => {
            const geometry = new Block("geometry");
            geometry.components.set(new GeometryBlockComponent("minecraft:geometry.full_block"));
            const reg = new Registry(OPTIONS).add(
                geometry,
                new Block("plain"),
                new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
                new ScatterFeature("elsewhere", { placesFeature: `${NS}:elsewhere` }),
            );
            const mixed = query(ScatterFeature, Block)
                .placing(`${NS}:ore`)
                .withComponent(GeometryBlockComponent);
            expect(await collect(reg, mixed)).toStrictEqual(["geometry", "scatter"]);
        });
    });
});

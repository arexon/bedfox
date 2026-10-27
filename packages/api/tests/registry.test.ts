import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

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
    DuplicateScheduleError,
    type Query,
    query,
    Registry,
    UnknownScheduleError,
} from "#/registry";
import { serialize, toReference } from "#/serialize";

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

/** Adds a system to each schedule, runs them, and returns the schedules in the order they ran. */
async function runOrder(reg: Registry<string>, schedules: string[]): Promise<string[]> {
    const order: string[] = [];
    for (const schedule of schedules) {
        reg.addSystem(schedule, () => order.push(schedule));
    }
    await reg.run();
    return order;
}

describe(Registry.name, () => {
    describe("add()", () => {
        test("registers definitions and chains", () => {
            const reg = new Registry(OPTIONS);
            const block = new Block("dirt");
            assert.equal(reg.add(block), reg);
            assert.deepEqual([...reg.all()], [block]);
        });

        test("ignores the same instance added twice", () => {
            const block = new Block("dirt");
            const reg = new Registry(OPTIONS).add(block).add(block);
            assert.deepEqual([...reg.all()], [block]);
        });

        test("rejects another definition written to the same file", () => {
            const reg = new Registry(OPTIONS).add(new Block("dirt"), new OreFeature("ore"));
            assert.throws(() => reg.add(new Block("dirt")), {
                name: "DuplicateIdentifierError",
                message:
                    "Can't add Block dirt, Block dirt is already written to blocks/dirt.json in the behavior pack",
            });
            assert.throws(() => reg.add(new ScatterFeature("ore")), DuplicateIdentifierError);
            assert.equal([...reg.all()].length, 2);
        });

        test("accepts a definition at a file freed by a removal", () => {
            const reg = new Registry(OPTIONS).add(new Block("dirt"));
            reg.remove(...reg.all());
            const dirt = new Block("dirt");
            reg.add(dirt);
            assert.deepEqual([...reg.all()], [dirt]);
        });

        test("allows the same identifier across kinds", () => {
            const reg = new Registry(OPTIONS).add(
                new Block("thing"),
                new OreFeature("thing"),
                new FeatureRules("thing", { placesFeature: `${NS}:thing` }),
            );
            assert.equal([...reg.all()].length, 3);
        });

        test("registers any definition kind", () => {
            const custom = new Custom("custom");
            assert.deepEqual([...new Registry(OPTIONS).add(custom).all()], [custom]);
        });

        test("rejects a definition in another registry, even with the same namespace", () => {
            const dirt = new Block("dirt");
            new Registry(OPTIONS).add(dirt);
            assert.throws(() => new Registry(OPTIONS).add(dirt), AlreadyRegisteredError);
        });

        test("registers nested definition instances", () => {
            const ore = new OreFeature("ore");
            const scatter = new ScatterFeature("scatter", { placesFeature: ore });
            const rules = new FeatureRules("rules", { placesFeature: scatter });
            const reg = new Registry(OPTIONS).add(rules);
            assert.deepEqual(ids(reg.all()), ["rules", "scatter", "ore"]);
        });

        test("registers reference cycles", () => {
            const a = new SequenceFeature("a", { features: [] });
            a.features.push(new SequenceFeature("b", { features: [a] }));
            assert.deepEqual(ids(new Registry(OPTIONS).add(a).all()), ["a", "b"]);
        });

        test("unregisters a definition whose references are rejected", () => {
            const reg = new Registry(OPTIONS).add(new OreFeature("ore"));
            const scatter = new ScatterFeature("scatter", { placesFeature: new OreFeature("ore") });
            assert.throws(() => reg.add(scatter), DuplicateIdentifierError);
            assert.deepEqual(ids(reg.all()), ["ore"]);
            assert.equal(scatter.qualifiedIdentifier, "scatter");
        });

        test("does not register string references", () => {
            const reg = new Registry(OPTIONS).add(
                new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
            );
            assert.deepEqual(ids(reg.all()), ["scatter"]);
        });
    });

    describe("remove()", () => {
        test("unregisters definitions", () => {
            const dirt = new Block("dirt");
            const stone = new Block("stone");
            const reg = new Registry(OPTIONS).add(dirt, stone);
            reg.remove(dirt);
            assert.deepEqual([...reg.all()], [stone]);
        });

        test("ignores another instance with the same identifier", () => {
            const dirt = new Block("dirt");
            const reg = new Registry(OPTIONS).add(dirt);
            reg.remove(new Block("dirt"));
            assert.deepEqual([...reg.all()], [dirt]);
        });

        test("lets the definition be added to another registry", () => {
            const dirt = new Block("dirt");
            new Registry(OPTIONS).add(dirt).remove(dirt);
            new Registry({ ...OPTIONS, namespace: "other" }).add(dirt);
            assert.equal(dirt.qualifiedIdentifier, "other:dirt");
        });
    });

    describe("namespaces", () => {
        test("qualify registered definitions", () => {
            const dirt = new Block("dirt");
            new Registry(OPTIONS).add(dirt);
            assert.equal(dirt.qualifiedIdentifier, `${NS}:dirt`);
            assert.equal(
                JSON.stringify(dirt),
                `{"format_version":"1.26.40","minecraft:block":{"description":{"identifier":"${NS}:dirt"}}}`,
            );
        });

        test("qualify references to instances registered through them", () => {
            const ore = new OreFeature("ore");
            new Registry(OPTIONS).add(new ScatterFeature("scatter", { placesFeature: ore }));
            const scatter = new ScatterFeature("other", { placesFeature: ore });
            assert.equal(ore.qualifiedIdentifier, `${NS}:ore`);
            assert.equal(
                JSON.stringify(scatter),
                `{"format_version":"1.26.50","minecraft:scatter_feature":{"description":{"identifier":"other"},"places_feature":"${NS}:ore"}}`,
            );
        });

        test("leave string references as written", () => {
            const scatter = new ScatterFeature("scatter", { placesFeature: "other:ore" });
            new Registry(OPTIONS).add(scatter);
            assert.equal(
                JSON.stringify(scatter),
                `{"format_version":"1.26.50","minecraft:scatter_feature":{"description":{"identifier":"${NS}:scatter"},"places_feature":"other:ore"}}`,
            );
        });

        test("leave unregistered definitions as written", () => {
            const dirt = new Block("dirt");
            assert.equal(dirt.qualifiedIdentifier, "dirt");
            assert.equal(dirt[toReference](), "dirt");
        });

        test("are cleared by remove()", () => {
            const dirt = new Block("dirt");
            new Registry(OPTIONS).add(dirt).remove(dirt);
            assert.equal(dirt.qualifiedIdentifier, "dirt");
            assert.doesNotThrow(() => new Registry({ ...OPTIONS, namespace: "other" }).add(dirt));
        });

        test("stay when remove() ignores another instance", () => {
            const dirt = new Block("dirt");
            const reg = new Registry(OPTIONS).add(dirt);
            const other = new Block("dirt");
            new Registry({ ...OPTIONS, namespace: "other" }).add(other);
            reg.remove(other);
            assert.equal(other.qualifiedIdentifier, "other:dirt");
        });
    });

    describe("manifests", () => {
        test("are derived from the namespace", (t) => {
            t.assert.snapshot(new Registry(OPTIONS).manifests);
        });

        test("can be edited by systems", async (t) => {
            const reg = new Registry(OPTIONS).addSystem((reg) =>
                reg.manifests.bp.module(new ScriptModule("scripts/main.js")),
            );
            await reg.run();
            t.assert.snapshot(reg.manifests.bp);
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
            assert.deepEqual(ids(reg.all()), ["rules", "b_ore", "b_block", "a_ore", "a_block"]);
        });
    });

    describe("resolve()", () => {
        const dirt = new Block("dirt");
        const ore = new OreFeature("ore");
        const reg = new Registry(OPTIONS).add(dirt, ore);

        test("finds a definition by class and identifier", () => {
            assert.deepEqual(reg.resolve(Block, "dirt"), [dirt]);
        });

        test("strips this registry's namespace", () => {
            assert.deepEqual(reg.resolve(Block, `${NS}:dirt`), [dirt]);
        });

        test("matches base classes", () => {
            assert.deepEqual(reg.resolve(Feature, "ore"), [ore]);
            assert.deepEqual(reg.resolve(Definition, "dirt"), [dirt]);
        });

        test("misses other classes", () => {
            assert.deepEqual(reg.resolve(Block, "ore"), []);
            assert.deepEqual(reg.resolve(ScatterFeature, "ore"), []);
        });

        test("misses unknown identifiers and other namespaces", () => {
            assert.deepEqual(reg.resolve(Block, "stone"), []);
            assert.deepEqual(reg.resolve(Block, "other:dirt"), []);
        });

        test("finds every kind sharing an identifier, in the order they were added", () => {
            const block = new Block("stone");
            const ore = new OreFeature("stone");
            const reg = new Registry(OPTIONS).add(block, ore);
            assert.deepEqual(reg.resolve(Definition, "stone"), [block, ore]);
        });
    });

    describe("matches()", () => {
        const dirt = new Block("dirt");
        const reg = new Registry(OPTIONS).add(dirt);

        test("compares identifiers ignoring this registry's namespace", () => {
            assert.ok(reg.matches({ ctor: Block, target: `${NS}:dirt` }, "dirt"));
            assert.ok(reg.matches({ ctor: Block, target: "dirt" }, `${NS}:dirt`));
            assert.equal(reg.matches({ ctor: Block, target: "other:dirt" }, "dirt"), false);
        });

        test("compares definitions and descriptors by identifier", () => {
            assert.ok(reg.matches({ ctor: Block, target: dirt }, `${NS}:dirt`));
            assert.ok(reg.matches({ ctor: Block, target: { name: `${NS}:dirt` } }, dirt));
            assert.ok(reg.matches({ ctor: Block, target: new Block("dirt") }, dirt));
        });

        test("checks classes against registered definitions", () => {
            assert.ok(reg.matches({ ctor: Block, target: `${NS}:dirt` }, Block));
            assert.ok(reg.matches({ ctor: Block, target: dirt }, Block));
            assert.equal(reg.matches({ ctor: Block, target: `${NS}:dirt` }, Feature), false);
            assert.equal(reg.matches({ ctor: Block, target: "minecraft:stone" }, Block), false);
        });

        test("rejects definitions of another kind with the same identifier", () => {
            const ore = new OreFeature("thing");
            const reg = new Registry(OPTIONS).add(new Block("thing"), ore);
            assert.equal(reg.matches({ ctor: Block, target: `${NS}:thing` }, ore), false);
            assert.equal(reg.matches({ ctor: Block, target: `${NS}:thing` }, Feature), false);
            assert.ok(reg.matches({ ctor: Feature, target: `${NS}:thing` }, OreFeature));
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
            assert.ok(reg.isReferenced(byInstance));
            assert.ok(reg.isReferenced(byId));
            assert.equal(reg.isReferenced(unused), false);
        });

        test("ignores references to another kind with the same identifier", () => {
            const block = new Block("thing");
            const ore = new OreFeature("thing").add(`${NS}:thing`, ["minecraft:stone"]);
            const reg = new Registry(OPTIONS).add(block, ore);
            assert.ok(reg.isReferenced(block));
            assert.equal(reg.isReferenced(ore), false);
        });

        test("ignores references from other namespaces", () => {
            const ore = new OreFeature("ore");
            const reg = new Registry(OPTIONS).add(
                ore,
                new FeatureRules("rules", { placesFeature: "other:ore" }),
            );
            assert.equal(reg.isReferenced(ore), false);
        });

        test("updates after adding and removing", () => {
            const ore = new OreFeature("ore");
            const rules = new FeatureRules("rules", { placesFeature: `${NS}:ore` });
            const reg = new Registry(OPTIONS).add(ore);
            assert.equal(reg.isReferenced(ore), false);
            reg.add(rules);
            assert.ok(reg.isReferenced(ore));
            reg.remove(rules);
            assert.equal(reg.isReferenced(ore), false);
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
            assert.deepEqual(seen, [true, false]);
        });
    });

    describe("systems", () => {
        test("run setup, then transform, then finalize, each in insertion order", async () => {
            const order: string[] = [];
            const push = (name: string) => () => order.push(name);
            const schedules = ["finalize", "transform", "setup"] as const;
            const reg = new Registry(OPTIONS);
            for (const schedule of schedules) {
                reg.addSystem(schedule, push(`${schedule} 1`), push(`${schedule} 2`));
            }
            await reg.run();
            assert.deepEqual(order, [
                "setup 1",
                "setup 2",
                "transform 1",
                "transform 2",
                "finalize 1",
                "finalize 2",
            ]);
        });

        test("default to transform", async () => {
            const order: string[] = [];
            await new Registry(OPTIONS)
                .addSystem("finalize", () => order.push("finalize"))
                .addSystem(() => order.push("default"))
                .addSystem("setup", () => order.push("setup"))
                .run();
            assert.deepEqual(order, ["setup", "default", "finalize"]);
        });

        test("see definitions added by earlier systems", async () => {
            let found: Block[] = [];
            await new Registry(OPTIONS)
                .addSystem("setup", (reg) => reg.add(new Block("dirt")))
                .addSystem((reg) => (found = reg.resolve(Block, "dirt")))
                .run();
            assert.deepEqual(ids(found), ["dirt"]);
        });

        test("receive the schedule they run on", async () => {
            const seen: string[] = [];
            await new Registry(OPTIONS)
                .add(new Block("dirt"))
                .addSystem("setup", (_, schedule) => seen.push(schedule))
                .addSystem((_, schedule) => seen.push(schedule))
                .addSystem(
                    "finalize",
                    query(Block).intoSystem((_, __, schedule) => seen.push(schedule)),
                )
                .run();
            assert.deepEqual(seen, ["setup", "transform", "finalize"]);
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
            assert.deepEqual(order, ["slow", "next"]);
        });

        test("rerun on every run", async () => {
            let count = 0;
            const reg = new Registry(OPTIONS).addSystem(() => count++);
            await reg.run();
            await reg.run();
            assert.equal(count, 2);
        });

        test("reject unknown schedules", () => {
            const reg = new Registry(OPTIONS);
            // @ts-expect-error not a schedule of this registry
            assert.throws(() => reg.addSystem("generate", () => {}), UnknownScheduleError);
        });
    });

    describe("schedules", () => {
        test("run in the given order", async () => {
            const reg = new Registry({
                ...OPTIONS,
                schedules: ["setup", "generate", "transform"],
            });
            assert.deepEqual(await runOrder(reg, ["transform", "generate", "setup"]), [
                "setup",
                "generate",
                "transform",
            ]);
        });

        test("default to setup, transform and finalize", async () => {
            const schedules = ["finalize", "transform", "setup"];
            assert.deepEqual(await runOrder(new Registry(OPTIONS), schedules), [
                "setup",
                "transform",
                "finalize",
            ]);
        });

        test("reject duplicates", () => {
            assert.throws(
                () =>
                    new Registry({
                        ...OPTIONS,
                        schedules: ["setup", "transform", "setup"],
                    }),
                DuplicateScheduleError,
            );
        });

        test("ignore changes to the given list", async () => {
            const schedules = ["setup", "transform"];
            const reg = new Registry({
                ...OPTIONS,
                schedules,
            });
            schedules.push("finalize");
            await assert.rejects(runOrder(reg, ["finalize"]), UnknownScheduleError);
        });

        test("run systems without a schedule on the default schedule", async () => {
            const order: string[] = [];
            await new Registry({
                ...OPTIONS,
                schedules: ["setup", "generate"],
                defaultSchedule: "generate",
            })
                .addSystem(() => order.push("default"))
                .addSystem("setup", () => order.push("setup"))
                .run();
            assert.deepEqual(order, ["setup", "default"]);
        });

        test("take a default schedule from the defaults", async () => {
            const order: string[] = [];
            await new Registry({
                ...OPTIONS,
                defaultSchedule: "finalize",
            })
                .addSystem(() => order.push("default"))
                .addSystem("transform", () => order.push("transform"))
                .run();
            assert.deepEqual(order, ["transform", "default"]);
        });

        test("reject a default schedule that isn't a schedule", () => {
            assert.throws(
                () =>
                    new Registry({
                        ...OPTIONS,
                        schedules: ["setup"],
                        // @ts-expect-error not one of the schedules
                        defaultSchedule: "transform",
                    }),
                UnknownScheduleError,
            );
        });

        test("reject systems without a schedule when there's no transform", () => {
            const reg = new Registry({
                ...OPTIONS,
                schedules: ["setup"],
            });
            // @ts-expect-error no transform schedule
            assert.throws(() => reg.addSystem(() => {}), UnknownScheduleError);
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
        assert.deepEqual(await collect(reg, query(Block)), ["dirt"]);
        assert.deepEqual(await collect(reg, query(FeatureRules, Block)), ["rules", "dirt"]);
        assert.deepEqual(await collect(reg, query(Definition)), ["rules", "ore", "dirt"]);
    });

    test("matches subclasses", async () => {
        const reg = new Registry(OPTIONS).add(
            new OreFeature("ore"),
            new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
        );
        assert.deepEqual(await collect(reg, query(Feature)), ["ore", "scatter"]);
        assert.deepEqual(await collect(reg, query(ScatterFeature)), ["scatter"]);
    });

    describe("intoSystem()", () => {
        test("skips the callback when nothing matches", async () => {
            let calls = 0;
            await new Registry(OPTIONS)
                .add(new OreFeature("ore"))
                .addSystem(query(Block).intoSystem(() => calls++))
                .run();
            assert.equal(calls, 0);
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
            assert.deepEqual(orphans, []);
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
            assert.deepEqual(features, ["b"]);
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
            assert.deepEqual(seen, ["oak"]);
            assert.deepEqual(ids(reg.all()), ["oak", "oak_slab"]);
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
            assert.deepEqual([...reg.all()], []);
        });
    });

    describe("filters", () => {
        test("filter() returns a new query", async () => {
            const reg = new Registry(OPTIONS).add(new Block("dirt"), new Block("stone"));
            const base = query(Block);
            const dirt = base.filter((block) => block.identifier === "dirt");
            const none = dirt.filter((block) => block.identifier === "stone");
            assert.deepEqual(await collect(reg, base), ["dirt", "stone"]);
            assert.deepEqual(await collect(reg, dirt), ["dirt"]);
            assert.deepEqual(await collect(reg, none), []);
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
            assert.deepEqual(await collect(reg, query(Feature).orphan()), ["unused"]);
            assert.deepEqual(await collect(reg, query(Definition).orphan()), ["rules", "unused"]);
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
                assert.deepEqual(await collect(reg, blocks.withComponent(FrictionBlockComponent)), [
                    "slippery",
                    "glowing",
                ]);
                assert.deepEqual(
                    await collect(
                        reg,
                        blocks.withComponent(FrictionBlockComponent, LightEmissionBlockComponent),
                    ),
                    ["glowing"],
                );
                assert.deepEqual(
                    await collect(reg, blocks.withoutComponent(LightEmissionBlockComponent)),
                    ["plain", "slippery"],
                );
                assert.deepEqual(
                    await collect(
                        reg,
                        blocks.withoutComponent(
                            FrictionBlockComponent,
                            LightEmissionBlockComponent,
                        ),
                    ),
                    ["plain"],
                );
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
                assert.deepEqual(await collect(reg, defs.withComponent(FrictionBlockComponent)), [
                    "slippery",
                    "ore",
                ]);
                assert.deepEqual(
                    await collect(reg, defs.withoutComponent(FrictionBlockComponent)),
                    ["plain", "ore"],
                );
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
                assert.deepEqual(await collect(reg, features.placing(dirt)), ["dirt_ore"]);
                assert.deepEqual(await collect(reg, features.placing("minecraft:stone")), [
                    "vanilla_ore",
                ]);
                assert.deepEqual(await collect(reg, features.placing(Block)), ["dirt_ore"]);
                assert.deepEqual(await collect(reg, features.placing(OreFeature)), ["scatter"]);
            });

            test("on feature rules", async () => {
                const ore = new OreFeature("ore");
                const reg = new Registry(OPTIONS).add(
                    new FeatureRules("ore_rules", { placesFeature: ore }),
                    new FeatureRules("vanilla_rules", { placesFeature: "minecraft:ore" }),
                );
                const rules = query(FeatureRules);
                assert.deepEqual(await collect(reg, rules.placing(ore)), ["ore_rules"]);
                assert.deepEqual(await collect(reg, rules.placing(`${NS}:ore`)), ["ore_rules"]);
                assert.deepEqual(await collect(reg, rules.placing(OreFeature)), ["ore_rules"]);
            });

            test("only filters features and feature rules", async () => {
                const ore = new OreFeature("ore");
                const reg = new Registry(OPTIONS).add(
                    new Block("dirt"),
                    new ScatterFeature("scatter", { placesFeature: ore }),
                    new ScatterFeature("elsewhere", { placesFeature: `${NS}:elsewhere` }),
                    new FeatureRules("rules", { placesFeature: ore }),
                );
                assert.deepEqual(await collect(reg, query(Definition).placing(ore)), [
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
            assert.deepEqual(await collect(reg, mixed), ["geometry", "scatter"]);
        });
    });
});

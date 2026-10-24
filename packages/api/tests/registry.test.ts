import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
    Block,
    FrictionBlockComponent,
    GeometryBlockComponent,
    LightEmissionBlockComponent,
} from "#/block/index";
import { Definition } from "#/core/index";
import { Feature, FeatureRules, OreFeature, ScatterFeature } from "#/feature/index";
import { FormatVersion } from "#/primitive/index";
import {
    DuplicateDefinitionIdError,
    DuplicateScheduleError,
    InvalidIdentifierError,
    type Query,
    query,
    Registry,
    UnknownDefinitionError,
    UnknownScheduleError,
} from "#/registry";

const NS = "test";

class Unregistrable extends Definition.of("test:unregistrable", new FormatVersion(1, 0, 0)) {
    override identifier = "unregistrable";
}

function ids(defs: Iterable<Definition>): string[] {
    return Array.from(defs, (def) => def.identifier);
}

function collect<T extends Definition>(reg: Registry, q: Query<T>): string[] {
    let result: string[] = [];
    reg.addSystem(q.intoSystem((_, defs) => (result = ids(defs)))).run();
    return result;
}

/** Adds a system to each schedule, runs them, and returns the schedules in the order they ran. */
function runOrder(reg: Registry<string>, schedules: string[]): string[] {
    const order: string[] = [];
    for (const schedule of schedules) {
        reg.addSystem(schedule, () => order.push(schedule));
    }
    reg.run();
    return order;
}

describe(Registry.name, () => {
    describe("add()", () => {
        test("registers definitions and chains", () => {
            const reg = new Registry(NS);
            const block = new Block("dirt");
            assert.equal(reg.add(block), reg);
            assert.deepEqual([...reg.all()], [block]);
        });

        test("ignores the same instance added twice", () => {
            const block = new Block("dirt");
            const reg = new Registry(NS).add(block).add(block);
            assert.deepEqual([...reg.all()], [block]);
        });

        test("rejects another instance with the same identifier", () => {
            const reg = new Registry(NS).add(new Block("dirt"));
            assert.throws(() => reg.add(new Block("dirt")), DuplicateDefinitionIdError);
        });

        test("allows the same identifier across kinds", () => {
            const reg = new Registry(NS).add(
                new Block("thing"),
                new OreFeature("thing"),
                new FeatureRules("thing", { placesFeature: `${NS}:thing` }),
            );
            assert.equal([...reg.all()].length, 3);
        });

        test("rejects invalid identifiers", () => {
            const reg = new Registry(NS);
            assert.throws(() => reg.add(new Block(`${NS}:dirt`)), InvalidIdentifierError);
        });

        test("rejects unknown definition kinds", () => {
            const reg = new Registry(NS);
            assert.throws(() => reg.add(new Unregistrable()), UnknownDefinitionError);
        });

        test("registers nested definition instances", () => {
            const ore = new OreFeature("ore");
            const scatter = new ScatterFeature("scatter", { placesFeature: ore });
            const rules = new FeatureRules("rules", { placesFeature: scatter });
            const reg = new Registry(NS).add(rules);
            assert.deepEqual(ids(reg.all()), ["ore", "scatter", "rules"]);
        });

        test("does not register string references", () => {
            const reg = new Registry(NS).add(
                new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
            );
            assert.deepEqual(ids(reg.all()), ["scatter"]);
        });
    });

    describe("remove()", () => {
        test("unregisters definitions", () => {
            const dirt = new Block("dirt");
            const stone = new Block("stone");
            const reg = new Registry(NS).add(dirt, stone);
            reg.remove(dirt);
            assert.deepEqual([...reg.all()], [stone]);
        });

        test("frees the identifier for another instance", () => {
            const reg = new Registry(NS);
            const old = new Block("dirt");
            reg.add(old).remove(old);
            assert.doesNotThrow(() => reg.add(new Block("dirt")));
        });

        test("ignores another instance with the same identifier", () => {
            const dirt = new Block("dirt");
            const reg = new Registry(NS).add(dirt);
            reg.remove(new Block("dirt"));
            assert.deepEqual([...reg.all()], [dirt]);
        });
    });

    describe("all()", () => {
        test("yields blocks, then features, then feature rules, each in insertion order", () => {
            const reg = new Registry(NS).add(
                new FeatureRules("rules", { placesFeature: `${NS}:b_ore` }),
                new OreFeature("b_ore"),
                new Block("b_block"),
                new OreFeature("a_ore"),
                new Block("a_block"),
            );
            assert.deepEqual(ids(reg.all()), ["b_block", "a_block", "b_ore", "a_ore", "rules"]);
        });
    });

    describe("resolve()", () => {
        const dirt = new Block("dirt");
        const ore = new OreFeature("ore");
        const reg = new Registry(NS).add(dirt, ore);

        test("finds a definition by class and identifier", () => {
            assert.equal(reg.resolve(Block, "dirt"), dirt);
        });

        test("strips this registry's namespace", () => {
            assert.equal(reg.resolve(Block, `${NS}:dirt`), dirt);
        });

        test("matches base classes", () => {
            assert.equal(reg.resolve(Feature, "ore"), ore);
            assert.equal(reg.resolve(Definition, "dirt"), dirt);
        });

        test("misses other classes", () => {
            assert.equal(reg.resolve(Block, "ore"), undefined);
            assert.equal(reg.resolve(ScatterFeature, "ore"), undefined);
        });

        test("misses unknown identifiers and other namespaces", () => {
            assert.equal(reg.resolve(Block, "stone"), undefined);
            assert.equal(reg.resolve(Block, "other:dirt"), undefined);
        });
    });

    describe("matches()", () => {
        const dirt = new Block("dirt");
        const reg = new Registry(NS).add(dirt);

        test("compares identifiers ignoring this registry's namespace", () => {
            assert.ok(reg.matches({ kind: Block, target: `${NS}:dirt` }, "dirt"));
            assert.ok(reg.matches({ kind: Block, target: "dirt" }, `${NS}:dirt`));
            assert.equal(reg.matches({ kind: Block, target: "other:dirt" }, "dirt"), false);
        });

        test("compares definitions and descriptors by identifier", () => {
            assert.ok(reg.matches({ kind: Block, target: dirt }, `${NS}:dirt`));
            assert.ok(reg.matches({ kind: Block, target: { name: `${NS}:dirt` } }, dirt));
            assert.ok(reg.matches({ kind: Block, target: new Block("dirt") }, dirt));
        });

        test("checks classes against registered definitions", () => {
            assert.ok(reg.matches({ kind: Block, target: `${NS}:dirt` }, Block));
            assert.ok(reg.matches({ kind: Block, target: dirt }, Block));
            assert.equal(reg.matches({ kind: Block, target: `${NS}:dirt` }, Feature), false);
            assert.equal(reg.matches({ kind: Block, target: "minecraft:stone" }, Block), false);
        });

        test("rejects definitions of another kind with the same identifier", () => {
            const ore = new OreFeature("thing");
            const reg = new Registry(NS).add(new Block("thing"), ore);
            assert.equal(reg.matches({ kind: Block, target: `${NS}:thing` }, ore), false);
            assert.equal(reg.matches({ kind: Block, target: `${NS}:thing` }, Feature), false);
            assert.ok(reg.matches({ kind: Feature, target: `${NS}:thing` }, OreFeature));
        });
    });

    describe("isReferenced()", () => {
        test("detects references by instance or identifier", () => {
            const byInstance = new OreFeature("by_instance");
            const byId = new OreFeature("by_id");
            const unused = new OreFeature("unused");
            const reg = new Registry(NS).add(
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
            const reg = new Registry(NS).add(block, ore);
            assert.ok(reg.isReferenced(block));
            assert.equal(reg.isReferenced(ore), false);
        });

        test("ignores references from other namespaces", () => {
            const ore = new OreFeature("ore");
            const reg = new Registry(NS).add(
                ore,
                new FeatureRules("rules", { placesFeature: "other:ore" }),
            );
            assert.equal(reg.isReferenced(ore), false);
        });

        test("updates after adding and removing", () => {
            const ore = new OreFeature("ore");
            const rules = new FeatureRules("rules", { placesFeature: `${NS}:ore` });
            const reg = new Registry(NS).add(ore);
            assert.equal(reg.isReferenced(ore), false);
            reg.add(rules);
            assert.ok(reg.isReferenced(ore));
            reg.remove(rules);
            assert.equal(reg.isReferenced(ore), false);
        });

        test("updates between systems that mutate definitions", () => {
            const ore = new OreFeature("ore");
            const rules = new FeatureRules("rules", { placesFeature: `${NS}:ore` });
            const seen: boolean[] = [];
            new Registry(NS)
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
        test("run setup, then transform, then finalize, each in insertion order", () => {
            const order: string[] = [];
            const push = (name: string) => () => order.push(name);
            const schedules = ["finalize", "transform", "setup"] as const;
            const reg = new Registry(NS);
            for (const schedule of schedules) {
                reg.addSystem(schedule, push(`${schedule} 1`), push(`${schedule} 2`));
            }
            reg.run();
            assert.deepEqual(order, [
                "setup 1",
                "setup 2",
                "transform 1",
                "transform 2",
                "finalize 1",
                "finalize 2",
            ]);
        });

        test("default to transform", () => {
            const order: string[] = [];
            new Registry(NS)
                .addSystem("finalize", () => order.push("finalize"))
                .addSystem(() => order.push("default"))
                .addSystem("setup", () => order.push("setup"))
                .run();
            assert.deepEqual(order, ["setup", "default", "finalize"]);
        });

        test("see definitions added by earlier systems", () => {
            let found: Block | undefined;
            new Registry(NS)
                .addSystem("setup", (reg) => reg.add(new Block("dirt")))
                .addSystem((reg) => (found = reg.resolve(Block, "dirt")))
                .run();
            assert.equal(found?.identifier, "dirt");
        });

        test("receive the schedule they run on", () => {
            const seen: string[] = [];
            new Registry(NS)
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

        test("rerun on every run", () => {
            let count = 0;
            const reg = new Registry(NS).addSystem(() => count++);
            reg.run();
            reg.run();
            assert.equal(count, 2);
        });

        test("reject unknown schedules", () => {
            const reg = new Registry(NS);
            // @ts-expect-error not a schedule of this registry
            assert.throws(() => reg.addSystem("generate", () => {}), UnknownScheduleError);
        });
    });

    describe("schedules", () => {
        test("run in the given order", () => {
            const reg = new Registry(NS, { schedules: ["setup", "generate", "transform"] });
            assert.deepEqual(runOrder(reg, ["transform", "generate", "setup"]), [
                "setup",
                "generate",
                "transform",
            ]);
        });

        test("default to setup, transform and finalize", () => {
            assert.deepEqual(runOrder(new Registry(NS), ["finalize", "transform", "setup"]), [
                "setup",
                "transform",
                "finalize",
            ]);
        });

        test("reject duplicates", () => {
            assert.throws(
                () => new Registry(NS, { schedules: ["setup", "transform", "setup"] }),
                DuplicateScheduleError,
            );
        });

        test("ignore changes to the given list", () => {
            const schedules = ["setup", "transform"];
            const reg = new Registry(NS, { schedules });
            schedules.push("finalize");
            assert.throws(() => runOrder(reg, ["finalize"]), UnknownScheduleError);
        });

        test("run systems without a schedule on the default schedule", () => {
            const order: string[] = [];
            new Registry(NS, { schedules: ["setup", "generate"], defaultSchedule: "generate" })
                .addSystem(() => order.push("default"))
                .addSystem("setup", () => order.push("setup"))
                .run();
            assert.deepEqual(order, ["setup", "default"]);
        });

        test("take a default schedule from the defaults", () => {
            const order: string[] = [];
            new Registry(NS, { defaultSchedule: "finalize" })
                .addSystem(() => order.push("default"))
                .addSystem("transform", () => order.push("transform"))
                .run();
            assert.deepEqual(order, ["transform", "default"]);
        });

        test("reject a default schedule that isn't a schedule", () => {
            assert.throws(
                // @ts-expect-error not one of the schedules
                () => new Registry(NS, { schedules: ["setup"], defaultSchedule: "transform" }),
                UnknownScheduleError,
            );
        });

        test("reject systems without a schedule when there's no transform", () => {
            const reg = new Registry(NS, { schedules: ["setup"] });
            // @ts-expect-error no transform schedule
            assert.throws(() => reg.addSystem(() => {}), UnknownScheduleError);
        });
    });
});

describe(query.name, () => {
    test("yields definitions of the given classes in registry order", () => {
        const reg = new Registry(NS).add(
            new FeatureRules("rules", { placesFeature: `${NS}:ore` }),
            new OreFeature("ore"),
            new Block("dirt"),
        );
        assert.deepEqual(collect(reg, query(Block)), ["dirt"]);
        assert.deepEqual(collect(reg, query(FeatureRules, Block)), ["dirt", "rules"]);
        assert.deepEqual(collect(reg, query(Definition)), ["dirt", "ore", "rules"]);
    });

    test("matches subclasses", () => {
        const reg = new Registry(NS).add(
            new OreFeature("ore"),
            new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
        );
        assert.deepEqual(collect(reg, query(Feature)), ["ore", "scatter"]);
        assert.deepEqual(collect(reg, query(ScatterFeature)), ["scatter"]);
    });

    describe("intoSystem()", () => {
        test("skips the callback when nothing matches", () => {
            let calls = 0;
            new Registry(NS)
                .add(new OreFeature("ore"))
                .addSystem(query(Block).intoSystem(() => calls++))
                .run();
            assert.equal(calls, 0);
        });

        test("rechecks the first match when the callback reads it", () => {
            const a = new OreFeature("a");
            const b = new OreFeature("b");
            let orphans: string[] = [];
            new Registry(NS)
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

        test("drops the first match if the callback removes it", () => {
            const a = new OreFeature("a");
            let features: string[] = [];
            new Registry(NS)
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
    });

    test("filter returns a new query", () => {
        const reg = new Registry(NS).add(new Block("dirt"), new Block("stone"));
        const base = query(Block);
        const dirt = base.filter((block) => block.identifier === "dirt");
        const none = dirt.filter((block) => block.identifier === "stone");
        assert.deepEqual(collect(reg, base), ["dirt", "stone"]);
        assert.deepEqual(collect(reg, dirt), ["dirt"]);
        assert.deepEqual(collect(reg, none), []);
    });

    test("allows removing definitions while iterating", () => {
        const reg = new Registry(NS).add(new Block("a"), new Block("b"), new Block("c"));
        reg.addSystem(
            query(Block).intoSystem((r, blocks) => {
                for (const block of blocks) r.remove(block);
            }),
        ).run();
        assert.deepEqual([...reg.all()], []);
    });

    test("only exposes filters for the kinds it could yield", () => {
        // @ts-expect-error blocks don't place anything
        assert.equal(typeof query(Block).placing, "function");
        // @ts-expect-error features don't have components
        assert.equal(typeof query(OreFeature).withComponent, "function");
        assert.equal(typeof query(Definition).withComponent, "function");
        assert.equal(typeof query(Definition).placing, "function");
    });

    describe("filters", () => {
        test("orphan()", () => {
            const reg = new Registry(NS).add(
                new FeatureRules("rules", {
                    placesFeature: new ScatterFeature("scatter", {
                        placesFeature: new OreFeature("used"),
                    }),
                }),
                new OreFeature("unused"),
            );
            assert.deepEqual(collect(reg, query(Feature).orphan()), ["unused"]);
            assert.deepEqual(collect(reg, query(Definition).orphan()), ["unused", "rules"]);
        });

        test("withComponent() and withoutComponent()", () => {
            const plain = new Block("plain");
            const slippery = new Block("slippery");
            slippery.components.set(new FrictionBlockComponent(0.1));
            const glowing = new Block("glowing");
            glowing.components.set(
                new FrictionBlockComponent(0.1),
                new LightEmissionBlockComponent(15),
            );
            const reg = new Registry(NS).add(plain, slippery, glowing);

            const blocks = query(Block);
            assert.deepEqual(collect(reg, blocks.withComponent(FrictionBlockComponent)), [
                "slippery",
                "glowing",
            ]);
            assert.deepEqual(
                collect(
                    reg,
                    blocks.withComponent(FrictionBlockComponent, LightEmissionBlockComponent),
                ),
                ["glowing"],
            );
            assert.deepEqual(collect(reg, blocks.withoutComponent(LightEmissionBlockComponent)), [
                "plain",
                "slippery",
            ]);
            assert.deepEqual(
                collect(
                    reg,
                    blocks.withoutComponent(FrictionBlockComponent, LightEmissionBlockComponent),
                ),
                ["plain"],
            );
        });

        test("withComponent() and withoutComponent() only filter blocks", () => {
            const slippery = new Block("slippery");
            slippery.components.set(new FrictionBlockComponent(0.1));
            const reg = new Registry(NS).add(slippery, new Block("plain"), new OreFeature("ore"));

            const defs = query(Definition);
            assert.deepEqual(collect(reg, defs.withComponent(FrictionBlockComponent)), [
                "slippery",
                "ore",
            ]);
            assert.deepEqual(collect(reg, defs.withoutComponent(FrictionBlockComponent)), [
                "plain",
                "ore",
            ]);
        });

        test("placing() on features", () => {
            const dirt = new Block("dirt");
            const reg = new Registry(NS).add(
                dirt,
                new OreFeature("dirt_ore").add(`${NS}:dirt`, ["minecraft:stone"]),
                new OreFeature("vanilla_ore").add("minecraft:stone", ["minecraft:deepslate"]),
                new ScatterFeature("scatter", { placesFeature: `${NS}:dirt_ore` }),
            );
            const features = query(Feature);
            assert.deepEqual(collect(reg, features.placing(dirt)), ["dirt_ore"]);
            assert.deepEqual(collect(reg, features.placing("minecraft:stone")), ["vanilla_ore"]);
            assert.deepEqual(collect(reg, features.placing(Block)), ["dirt_ore"]);
            assert.deepEqual(collect(reg, features.placing(OreFeature)), ["scatter"]);
        });

        test("placing() on feature rules", () => {
            const ore = new OreFeature("ore");
            const reg = new Registry(NS).add(
                new FeatureRules("ore_rules", { placesFeature: ore }),
                new FeatureRules("vanilla_rules", { placesFeature: "minecraft:ore" }),
            );
            const rules = query(FeatureRules);
            assert.deepEqual(collect(reg, rules.placing(ore)), ["ore_rules"]);
            assert.deepEqual(collect(reg, rules.placing(`${NS}:ore`)), ["ore_rules"]);
            assert.deepEqual(collect(reg, rules.placing(OreFeature)), ["ore_rules"]);
        });

        test("placing() only filters features and feature rules", () => {
            const ore = new OreFeature("ore");
            const reg = new Registry(NS).add(
                new Block("dirt"),
                new ScatterFeature("scatter", { placesFeature: ore }),
                new ScatterFeature("elsewhere", { placesFeature: `${NS}:elsewhere` }),
                new FeatureRules("rules", { placesFeature: ore }),
            );
            assert.deepEqual(collect(reg, query(Definition).placing(ore)), [
                "dirt",
                "scatter",
                "rules",
            ]);
        });

        test("kind filters can be mixed", () => {
            const geometry = new Block("geometry");
            geometry.components.set(new GeometryBlockComponent("minecraft:geometry.full_block"));
            const reg = new Registry(NS).add(
                geometry,
                new Block("plain"),
                new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
                new ScatterFeature("elsewhere", { placesFeature: `${NS}:elsewhere` }),
            );
            const mixed = query(ScatterFeature, Block)
                .placing(`${NS}:ore`)
                .withComponent(GeometryBlockComponent);
            assert.deepEqual(collect(reg, mixed), ["geometry", "scatter"]);
        });

        test("placing() only accepts what the kind can place", () => {
            const features = query(Feature);
            const rules = query(FeatureRules);
            // @ts-expect-error rules only place features
            rules.placing(Block);
            // @ts-expect-error rules only place features
            rules.placing({ name: "minecraft:stone" });
            assert.ok(query(Definition).placing(Block));
            assert.ok(features.placing("minecraft:stone"));
            assert.ok(rules.placing(OreFeature));
            assert.ok(rules.placing("minecraft:ore"));
        });
    });
});

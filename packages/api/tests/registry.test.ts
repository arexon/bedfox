import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Block, FrictionBlockComponent, LightEmissionBlockComponent } from "#/block/index";
import { Definition } from "#/core/index";
import { Feature, FeatureRules, OreFeature, ScatterFeature } from "#/feature/index";
import { FormatVersion } from "#/primitive/index";
import {
    DuplicateDefinitionIdError,
    InvalidIdentifierError,
    Query,
    Registry,
    UnknownDefinitionError,
    type Schedule,
} from "#/registry";

const NS = "test";

class Unregistrable extends Definition.of("test:unregistrable", new FormatVersion(1, 0, 0)) {
    override identifier = "unregistrable";
}

function ids(defs: Iterable<Definition>): string[] {
    return Array.from(defs, (def) => def.identifier);
}

function collect<T extends [Definition, ...Definition[]]>(
    reg: Registry,
    query: Query<T>,
): string[] {
    let result: string[] = [];
    reg.addSystem(query.system((_, defs) => (result = ids(defs)))).run();
    return result;
}

describe("Registry", () => {
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

        test("ignores definitions that are not registered", () => {
            const reg = new Registry(NS);
            assert.doesNotThrow(() => reg.remove(new Block("dirt")));
        });

        test("rejects unknown definition kinds", () => {
            const reg = new Registry(NS);
            assert.throws(() => reg.remove(new Unregistrable()), UnknownDefinitionError);
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

        test("yields nothing when empty", () => {
            assert.deepEqual([...new Registry(NS).all()], []);
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

        test("keeps other namespaces", () => {
            assert.equal(reg.resolve(Block, "other:dirt"), undefined);
        });

        test("matches base classes", () => {
            assert.equal(reg.resolve(Feature, "ore"), ore);
            assert.equal(reg.resolve(Definition, "dirt"), dirt);
        });

        test("misses other classes", () => {
            assert.equal(reg.resolve(Block, "ore"), undefined);
            assert.equal(reg.resolve(ScatterFeature, "ore"), undefined);
        });

        test("misses unknown identifiers", () => {
            assert.equal(reg.resolve(Block, "stone"), undefined);
        });
    });

    describe("matches()", () => {
        const dirt = new Block("dirt");
        const reg = new Registry(NS).add(dirt);

        test("compares identifiers ignoring this registry's namespace", () => {
            assert.ok(reg.matches(`${NS}:dirt`, "dirt"));
            assert.ok(reg.matches("dirt", `${NS}:dirt`));
            assert.equal(reg.matches("other:dirt", "dirt"), false);
        });

        test("compares definitions and descriptors by identifier", () => {
            assert.ok(reg.matches(dirt, `${NS}:dirt`));
            assert.ok(reg.matches({ name: `${NS}:dirt` }, dirt));
            assert.ok(reg.matches(new Block("dirt"), dirt));
        });

        test("checks classes against registered definitions", () => {
            assert.ok(reg.matches(`${NS}:dirt`, Block));
            assert.ok(reg.matches(dirt, Block));
            assert.equal(reg.matches(`${NS}:dirt`, Feature), false);
            assert.equal(reg.matches(`${NS}:stone`, Block), false);
            assert.equal(reg.matches("minecraft:stone", Block), false);
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
            const push = (name: string) => () => void order.push(name);
            const schedules: Schedule[] = ["finalize", "transform", "setup"];
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

        test("receive the registry", () => {
            const reg = new Registry(NS);
            let received: Registry | undefined;
            reg.addSystem((r) => (received = r)).run();
            assert.equal(received, reg);
        });

        test("see definitions added by earlier systems", () => {
            let found: Block | undefined;
            new Registry(NS)
                .addSystem("setup", (reg) => reg.add(new Block("dirt")))
                .addSystem((reg) => (found = reg.resolve(Block, "dirt")))
                .run();
            assert.equal(found?.identifier, "dirt");
        });

        test("rerun on every run", () => {
            let count = 0;
            const reg = new Registry(NS).addSystem(() => count++);
            reg.run();
            reg.run();
            assert.equal(count, 2);
        });
    });
});

describe("Query", () => {
    test("yields definitions of the given classes in registry order", () => {
        const reg = new Registry(NS).add(
            new FeatureRules("rules", { placesFeature: `${NS}:ore` }),
            new OreFeature("ore"),
            new Block("dirt"),
        );
        assert.deepEqual(collect(reg, new Query(Block)), ["dirt"]);
        assert.deepEqual(collect(reg, new Query(FeatureRules, Block)), ["dirt", "rules"]);
        assert.deepEqual(collect(reg, new Query(Definition)), ["dirt", "ore", "rules"]);
    });

    test("matches subclasses", () => {
        const reg = new Registry(NS).add(
            new OreFeature("ore"),
            new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
        );
        assert.deepEqual(collect(reg, new Query(Feature)), ["ore", "scatter"]);
        assert.deepEqual(collect(reg, new Query(ScatterFeature)), ["scatter"]);
    });

    test("applies every filter", () => {
        const reg = new Registry(NS).add(
            new Block("dirt"),
            new Block("dirt_slab"),
            new Block("stone_slab"),
        );
        const query = new Query(Block).filter(
            Query.where((block) => block.identifier.startsWith("dirt")),
            Query.where((block) => block.identifier.endsWith("slab")),
        );
        assert.deepEqual(collect(reg, query), ["dirt_slab"]);
    });

    test("filter returns a new query", () => {
        const reg = new Registry(NS).add(new Block("dirt"), new Block("stone"));
        const base = new Query(Block);
        const dirt = base.filter((block) => block.identifier === "dirt");
        const none = dirt.filter((block) => block.identifier === "stone");
        assert.deepEqual(collect(reg, base), ["dirt", "stone"]);
        assert.deepEqual(collect(reg, dirt), ["dirt"]);
        assert.deepEqual(collect(reg, none), []);
    });

    test("passes the registry to filters", () => {
        const reg = new Registry(NS).add(new Block("dirt"));
        let received: Registry | undefined;
        collect(
            reg,
            new Query(Block).filter((_, r) => ((received = r), true)),
        );
        assert.equal(received, reg);
    });

    test("allows removing definitions while iterating", () => {
        const reg = new Registry(NS).add(new Block("a"), new Block("b"), new Block("c"));
        reg.addSystem(
            new Query(Block).system((r, blocks) => {
                for (const block of blocks) r.remove(block);
            }),
        ).run();
        assert.deepEqual([...reg.all()], []);
    });

    describe("filters", () => {
        test("Definition.orphan()", () => {
            const reg = new Registry(NS).add(
                new FeatureRules("rules", {
                    placesFeature: new ScatterFeature("scatter", {
                        placesFeature: new OreFeature("used"),
                    }),
                }),
                new OreFeature("unused"),
            );
            assert.deepEqual(collect(reg, new Query(Feature).filter(Definition.orphan())), [
                "unused",
            ]);
            assert.deepEqual(collect(reg, new Query(Definition).filter(Definition.orphan())), [
                "unused",
                "rules",
            ]);
        });

        test("Block.withComponent() and Block.withoutComponent()", () => {
            const plain = new Block("plain");
            const slippery = new Block("slippery");
            slippery.components.set(new FrictionBlockComponent(0.1));
            const glowing = new Block("glowing");
            glowing.components.set(
                new FrictionBlockComponent(0.1),
                new LightEmissionBlockComponent(15),
            );
            const reg = new Registry(NS).add(plain, slippery, glowing);

            const query = new Query(Block);
            assert.deepEqual(
                collect(reg, query.filter(Block.withComponent(FrictionBlockComponent))),
                ["slippery", "glowing"],
            );
            assert.deepEqual(
                collect(
                    reg,
                    query.filter(
                        Block.withComponent(FrictionBlockComponent, LightEmissionBlockComponent),
                    ),
                ),
                ["glowing"],
            );
            assert.deepEqual(
                collect(reg, query.filter(Block.withoutComponent(LightEmissionBlockComponent))),
                ["plain", "slippery"],
            );
            assert.deepEqual(
                collect(
                    reg,
                    query.filter(
                        Block.withoutComponent(FrictionBlockComponent, LightEmissionBlockComponent),
                    ),
                ),
                ["plain"],
            );
        });

        test("Feature.placing()", () => {
            const dirt = new Block("dirt");
            const reg = new Registry(NS).add(
                dirt,
                new OreFeature("dirt_ore").add(`${NS}:dirt`, ["minecraft:stone"]),
                new OreFeature("vanilla_ore").add("minecraft:stone", ["minecraft:deepslate"]),
                new ScatterFeature("scatter", { placesFeature: `${NS}:dirt_ore` }),
            );
            const query = new Query(Feature);
            assert.deepEqual(collect(reg, query.filter(Feature.placing(dirt))), ["dirt_ore"]);
            assert.deepEqual(collect(reg, query.filter(Feature.placing("minecraft:stone"))), [
                "vanilla_ore",
            ]);
            assert.deepEqual(collect(reg, query.filter(Feature.placing(Block))), ["dirt_ore"]);
            assert.deepEqual(collect(reg, query.filter(Feature.placing(OreFeature))), ["scatter"]);
        });

        test("FeatureRules.placing()", () => {
            const ore = new OreFeature("ore");
            const reg = new Registry(NS).add(
                new FeatureRules("ore_rules", { placesFeature: ore }),
                new FeatureRules("vanilla_rules", { placesFeature: "minecraft:ore" }),
            );
            const query = new Query(FeatureRules);
            assert.deepEqual(collect(reg, query.filter(FeatureRules.placing(ore))), ["ore_rules"]);
            assert.deepEqual(collect(reg, query.filter(FeatureRules.placing(`${NS}:ore`))), [
                "ore_rules",
            ]);
            assert.deepEqual(collect(reg, query.filter(FeatureRules.placing(OreFeature))), [
                "ore_rules",
            ]);
        });
    });
});

import { describe, expect, test } from "vite-plus/test";

import {
    Block,
    FrictionBlockComponent,
    GeometryBlockComponent,
    LightEmissionBlockComponent,
} from "#/block/index";
import { Definition } from "#/core/index";
import { Feature, FeatureRules, OreFeature, ScatterFeature } from "#/feature/index";
import {
    type PreparedSystem,
    Project,
    type Query,
    query,
    type System,
    SystemFailedError,
} from "#/project/index";
import type { Registry } from "#/registry/index";

const NS = "test";

function ids(defs: Iterable<Definition>): string[] {
    return Array.from(defs, (def) => def.identifier);
}

/**
 * Runs a new project with `systems` on `setup`, and returns the run's closed registry. If a system
 * fails, it rethrows the cause, so that tests can expect the original error.
 */
async function runSetup(...systems: (System | PreparedSystem<unknown>)[]): Promise<Registry> {
    const registry = Promise.withResolvers<Registry>();
    const project = new Project({ namespace: NS }).addSystem("setup", registry.resolve, ...systems);
    try {
        await project.run();
    } catch (error) {
        throw error instanceof SystemFailedError ? error.cause : error;
    }
    return registry.promise;
}

/** Adds `defs` in a new project's run, and returns the run's closed registry. */
function registryWith(...defs: Definition[]): Promise<Registry> {
    return runSetup((reg) => reg.add(...defs));
}

/** The identifiers that `q` matches in `reg`. A closed registry can still be queried. */
function collect<T extends Definition>(reg: Registry, q: Query<T>): string[] {
    let result: string[] = [];
    q.intoSystem((_, defs) => (result = ids(defs)))(reg);
    return result;
}

describe(query.name, () => {
    test("yields definitions of the given classes in the order they were added", async () => {
        const reg = await registryWith(
            new FeatureRules("rules", { placesFeature: `${NS}:ore` }),
            new OreFeature("ore"),
            new Block("dirt"),
        );
        expect(collect(reg, query(Block))).toStrictEqual(["dirt"]);
        expect(collect(reg, query(FeatureRules, Block))).toStrictEqual(["rules", "dirt"]);
        expect(collect(reg, query(Definition))).toStrictEqual(["rules", "ore", "dirt"]);
    });

    test("matches subclasses", async () => {
        const reg = await registryWith(
            new OreFeature("ore"),
            new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
        );
        expect(collect(reg, query(Feature))).toStrictEqual(["ore", "scatter"]);
        expect(collect(reg, query(ScatterFeature))).toStrictEqual(["scatter"]);
    });

    describe("intoSystem()", () => {
        test("skips the callback when nothing matches", async () => {
            let calls = 0;
            await runSetup(
                (reg) => reg.add(new OreFeature("ore")),
                query(Block).intoSystem(() => calls++),
            );
            expect(calls).toBe(0);
        });

        test("rechecks the first match when the callback reads it", async () => {
            const a = new OreFeature("a");
            const b = new OreFeature("b");
            let orphans: string[] = [];
            await runSetup(
                (reg) => reg.add(a, b),
                query(Feature)
                    .orphan()
                    .intoSystem((reg, features) => {
                        reg.add(
                            new FeatureRules("rules_a", { placesFeature: a }),
                            new FeatureRules("rules_b", { placesFeature: b }),
                        );
                        orphans = ids(features);
                    }),
            );
            expect(orphans).toStrictEqual([]);
        });

        test("drops the first match if the callback removes it", async () => {
            const a = new OreFeature("a");
            let features: string[] = [];
            await runSetup(
                (reg) => reg.add(a, new OreFeature("b")),
                query(Feature).intoSystem((reg, defs) => {
                    reg.remove(a);
                    features = ids(defs);
                }),
            );
            expect(features).toStrictEqual(["b"]);
        });

        test("doesn't yield definitions added while iterating", async () => {
            const seen: string[] = [];
            const reg = await runSetup(
                (reg) => reg.add(new Block("oak")),
                query(Block).intoSystem((reg, blocks) => {
                    for (const block of blocks) {
                        seen.push(block.identifier);
                        reg.add(new Block(`${block.identifier}_slab`));
                    }
                }),
            );
            expect(seen).toStrictEqual(["oak"]);
            expect(ids(reg.all())).toStrictEqual(["oak", "oak_slab"]);
        });

        test("allows removing definitions while iterating", async () => {
            const reg = await runSetup(
                (reg) => reg.add(new Block("a"), new Block("b"), new Block("c")),
                query(Block).intoSystem((r, blocks) => {
                    for (const block of blocks) r.remove(block);
                }),
            );
            expect([...reg.all()]).toStrictEqual([]);
        });

        test("rejects async callbacks, even before anything matches", () => {
            expect(() => query(Block).intoSystem(async () => {})).toThrow(
                expect.objectContaining({
                    name: "AsyncSystemError",
                    message:
                        "The callback of intoSystem() is async. Systems must be sync, so move async work into the prepare step of a prepared system",
                }),
            );
        });
    });

    describe("intoPreparedSystem()", () => {
        test("passes the matched definitions and the prepared value", async () => {
            let seen: unknown[] = [];
            await runSetup(
                (reg) => reg.add(new Block("dirt"), new OreFeature("ore")),
                query(Block).intoPreparedSystem(
                    async () => "colors",
                    (_, blocks, colors) => (seen = [ids(blocks), colors]),
                ),
            );
            expect(seen).toStrictEqual([["dirt"], "colors"]);
        });

        test("prepares but skips the callback when nothing matches", async () => {
            let prepares = 0;
            let calls = 0;
            await runSetup(
                query(Block).intoPreparedSystem(
                    async () => prepares++,
                    () => calls++,
                ),
            );
            expect([prepares, calls]).toStrictEqual([1, 0]);
        });

        test("rejects async callbacks, but not an async prepare step", () => {
            expect(() =>
                query(Block).intoPreparedSystem(
                    async () => 1,
                    async () => {},
                ),
            ).toThrow(
                expect.objectContaining({
                    name: "AsyncSystemError",
                    message:
                        "The callback of intoPreparedSystem() is async. Systems must be sync, so move async work into the prepare step of a prepared system",
                }),
            );
            expect(() =>
                query(Block).intoPreparedSystem(
                    async () => 1,
                    () => {},
                ),
            ).not.toThrow();
        });
    });

    describe("filters", () => {
        test("filter() returns a new query", async () => {
            const reg = await registryWith(new Block("dirt"), new Block("stone"));
            const base = query(Block);
            const dirt = base.filter((block) => block.identifier === "dirt");
            const none = dirt.filter((block) => block.identifier === "stone");
            expect(collect(reg, base)).toStrictEqual(["dirt", "stone"]);
            expect(collect(reg, dirt)).toStrictEqual(["dirt"]);
            expect(collect(reg, none)).toStrictEqual([]);
        });

        test("orphan()", async () => {
            const reg = await registryWith(
                new FeatureRules("rules", {
                    placesFeature: new ScatterFeature("scatter", {
                        placesFeature: new OreFeature("used"),
                    }),
                }),
                new OreFeature("unused"),
            );
            expect(collect(reg, query(Feature).orphan())).toStrictEqual(["unused"]);
            expect(collect(reg, query(Definition).orphan())).toStrictEqual(["rules", "unused"]);
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
                const reg = await registryWith(plain, slippery, glowing);

                const blocks = query(Block);
                expect(collect(reg, blocks.withComponent(FrictionBlockComponent))).toStrictEqual([
                    "slippery",
                    "glowing",
                ]);
                expect(
                    collect(
                        reg,
                        blocks.withComponent(FrictionBlockComponent, LightEmissionBlockComponent),
                    ),
                ).toStrictEqual(["glowing"]);
                expect(
                    collect(reg, blocks.withoutComponent(LightEmissionBlockComponent)),
                ).toStrictEqual(["plain", "slippery"]);
                expect(
                    collect(
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
                const reg = await registryWith(slippery, new Block("plain"), new OreFeature("ore"));

                const defs = query(Definition);
                expect(collect(reg, defs.withComponent(FrictionBlockComponent))).toStrictEqual([
                    "slippery",
                    "ore",
                ]);
                expect(collect(reg, defs.withoutComponent(FrictionBlockComponent))).toStrictEqual([
                    "plain",
                    "ore",
                ]);
            });
        });

        describe("placing()", () => {
            test("on features", async () => {
                const dirt = new Block("dirt");
                const reg = await registryWith(
                    dirt,
                    new OreFeature("dirt_ore").add(`${NS}:dirt`, ["minecraft:stone"]),
                    new OreFeature("vanilla_ore").add("minecraft:stone", ["minecraft:deepslate"]),
                    new ScatterFeature("scatter", { placesFeature: `${NS}:dirt_ore` }),
                );
                const features = query(Feature);
                expect(collect(reg, features.placing(dirt))).toStrictEqual(["dirt_ore"]);
                expect(collect(reg, features.placing("minecraft:stone"))).toStrictEqual([
                    "vanilla_ore",
                ]);
                expect(collect(reg, features.placing(Block))).toStrictEqual(["dirt_ore"]);
                expect(collect(reg, features.placing(OreFeature))).toStrictEqual(["scatter"]);
            });

            test("on feature rules", async () => {
                const ore = new OreFeature("ore");
                const reg = await registryWith(
                    new FeatureRules("ore_rules", { placesFeature: ore }),
                    new FeatureRules("vanilla_rules", { placesFeature: "minecraft:ore" }),
                );
                const rules = query(FeatureRules);
                expect(collect(reg, rules.placing(ore))).toStrictEqual(["ore_rules"]);
                expect(collect(reg, rules.placing(`${NS}:ore`))).toStrictEqual(["ore_rules"]);
                expect(collect(reg, rules.placing(OreFeature))).toStrictEqual(["ore_rules"]);
            });

            test("only filters features and feature rules", async () => {
                const ore = new OreFeature("ore");
                const reg = await registryWith(
                    new Block("dirt"),
                    new ScatterFeature("scatter", { placesFeature: ore }),
                    new ScatterFeature("elsewhere", { placesFeature: `${NS}:elsewhere` }),
                    new FeatureRules("rules", { placesFeature: ore }),
                );
                expect(collect(reg, query(Definition).placing(ore))).toStrictEqual([
                    "dirt",
                    "scatter",
                    "rules",
                ]);
            });
        });

        test("kind filters can be mixed", async () => {
            const geometry = new Block("geometry");
            geometry.components.set(new GeometryBlockComponent("minecraft:geometry.full_block"));
            const reg = await registryWith(
                geometry,
                new Block("plain"),
                new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
                new ScatterFeature("elsewhere", { placesFeature: `${NS}:elsewhere` }),
            );
            const mixed = query(ScatterFeature, Block)
                .placing(`${NS}:ore`)
                .withComponent(GeometryBlockComponent);
            expect(collect(reg, mixed)).toStrictEqual(["geometry", "scatter"]);
        });
    });
});

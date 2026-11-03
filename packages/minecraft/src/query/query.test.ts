import { setTimeout as delay } from "node:timers/promises";

import type { Entry, Registry } from "@bedfox/core";
import { describe, expect, test } from "vite-plus/test";

import {
    Block,
    FrictionBlockComponent,
    GeometryBlockComponent,
    LightEmissionBlockComponent,
} from "#/block/index";
import { Definition } from "#/definition/definition";
import { Feature } from "#/feature/base";
import { OreFeature } from "#/feature/ore";
import { FeatureRules } from "#/feature/rules";
import { ScatterFeature } from "#/feature/scatter";
import { type Query, query } from "#/query/index";
import { ids, NS, registryWith, runSetup } from "#/test/helpers";

async function collect<T extends Entry>(reg: Registry, q: Query<T>): Promise<string[]> {
    let result: string[] = [];
    await runSetup(
        NS,
        (next) => {
            next.add(...reg.entries());
        },
        q.intoSystem((_, defs) => {
            result = ids(defs);
        }),
    );
    return result;
}

describe(query.name, () => {
    test("yields definitions of the given classes in the order they were added", async () => {
        const reg = await registryWith(
            new FeatureRules("rules", { placesFeature: `${NS}:ore` }),
            new OreFeature("ore"),
            new Block("dirt"),
        );
        expect(await collect(reg, query(Block))).toStrictEqual(["dirt"]);
        expect(await collect(reg, query(FeatureRules, Block))).toStrictEqual(["rules", "dirt"]);
        expect(await collect(reg, query(Definition))).toStrictEqual(["rules", "ore", "dirt"]);
    });

    test("matches subclasses", async () => {
        const reg = await registryWith(
            new OreFeature("ore"),
            new ScatterFeature("scatter", { placesFeature: `${NS}:ore` }),
        );
        expect(await collect(reg, query(Feature))).toStrictEqual(["ore", "scatter"]);
        expect(await collect(reg, query(ScatterFeature))).toStrictEqual(["scatter"]);
    });

    describe("intoSystem()", () => {
        test("skips the callback when nothing matches", async () => {
            let calls = 0;
            await runSetup(
                NS,
                (reg) => {
                    reg.add(new OreFeature("ore"));
                },
                query(Block).intoSystem(() => {
                    calls++;
                }),
            );
            expect(calls).toBe(0);
        });

        test("rechecks the first match when the callback reads it", async () => {
            const a = new OreFeature("a");
            const b = new OreFeature("b");
            let orphans: string[] = [];
            await runSetup(
                NS,
                (reg) => {
                    reg.add(a, b);
                },
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
                NS,
                (reg) => {
                    reg.add(a, new OreFeature("b"));
                },
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
                NS,
                (reg) => {
                    reg.add(new Block("oak"));
                },
                query(Block).intoSystem((reg, blocks) => {
                    for (const block of blocks) {
                        seen.push(block.identifier);
                        reg.add(new Block(`${block.identifier}_slab`));
                    }
                }),
            );
            expect(seen).toStrictEqual(["oak"]);
            expect(ids(reg.entries())).toStrictEqual(["oak", "oak_slab"]);
        });

        test("allows removing definitions while iterating", async () => {
            const reg = await runSetup(
                NS,
                (reg) => {
                    reg.add(new Block("a"), new Block("b"), new Block("c"));
                },
                query(Block).intoSystem((r, blocks) => {
                    for (const block of blocks) r.remove(block);
                }),
            );
            expect([...reg.entries()]).toStrictEqual([]);
        });

        test("waits for an async callback before the next system", async () => {
            const order: string[] = [];
            await runSetup(
                NS,
                (reg) => {
                    reg.add(new Block("dirt"));
                },
                query(Block).intoSystem(async (_, blocks) => {
                    await delay(1);
                    order.push(...ids(blocks));
                }),
                () => {
                    order.push("after");
                },
            );
            expect(order).toStrictEqual(["dirt", "after"]);
        });
    });

    describe("intoSystem() with a load function", () => {
        test("passes the matched definitions and the loaded value", async () => {
            let seen: unknown[] = [];
            await runSetup(
                NS,
                (reg) => {
                    reg.add(new Block("dirt"), new OreFeature("ore"));
                },
                query(Block).intoSystem(
                    (_, blocks, colors) => {
                        seen = [ids(blocks), colors];
                    },
                    () => "colors",
                ),
            );
            expect(seen).toStrictEqual([["dirt"], "colors"]);
        });

        test("loads but skips the callback when nothing matches", async () => {
            let loads = 0;
            let calls = 0;
            await runSetup(
                NS,
                query(Block).intoSystem(
                    () => {
                        calls++;
                    },
                    () => loads++,
                ),
            );
            expect([loads, calls]).toStrictEqual([1, 0]);
        });

        test("waits for an async callback before the next system", async () => {
            const order: string[] = [];
            await runSetup(
                NS,
                (reg) => {
                    reg.add(new Block("dirt"));
                },
                query(Block).intoSystem(
                    async (_, blocks, colors) => {
                        await delay(1);
                        order.push(...ids(blocks), colors);
                    },
                    () => "colors",
                ),
                () => {
                    order.push("after");
                },
            );
            expect(order).toStrictEqual(["dirt", "colors", "after"]);
        });
    });

    describe("filters", () => {
        test("filter() returns a new query", async () => {
            const reg = await registryWith(new Block("dirt"), new Block("stone"));
            const base = query(Block);
            const dirt = base.filter((block) => block.identifier === "dirt");
            const none = dirt.filter((block) => block.identifier === "stone");
            expect(await collect(reg, base)).toStrictEqual(["dirt", "stone"]);
            expect(await collect(reg, dirt)).toStrictEqual(["dirt"]);
            expect(await collect(reg, none)).toStrictEqual([]);
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
                const reg = await registryWith(plain, slippery, glowing);

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
                const reg = await registryWith(slippery, new Block("plain"), new OreFeature("ore"));

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
                const reg = await registryWith(
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
                expect(
                    await collect(reg, features.placing({ name: "minecraft:stone" })),
                ).toStrictEqual(["vanilla_ore"]);
                expect(await collect(reg, features.placing(Block))).toStrictEqual(["dirt_ore"]);
                expect(await collect(reg, features.placing(OreFeature))).toStrictEqual(["scatter"]);
            });

            test("on feature rules", async () => {
                const ore = new OreFeature("ore");
                const reg = await registryWith(
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
                const reg = await registryWith(
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
            const reg = await registryWith(
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

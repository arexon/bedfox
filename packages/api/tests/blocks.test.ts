import { describe, test } from "node:test";

import {
    Block,
    BlockEntityBlockComponent,
    BlockPermutation,
    BlockTraitCollection,
    BoundingBox,
    ChestObstructionBlockComponent,
    CollisionBoxBlockComponent,
    ConnectionBlockTrait,
    ConnectionRuleBlockComponent,
    CraftingTableBlockComponent,
    DestructibleByExplosionBlockComponent,
    DestructibleByMiningBlockComponent,
    DestructionParticlesBlockComponent,
    DisplayNameBlockComponent,
    EmbeddedVisualBlockComponent,
    EntityFallOnBlockComponent,
    FlammableBlockComponent,
    FlowerPottableBlockComponent,
    FrictionBlockComponent,
    GeometryBlockComponent,
    InstrumentSoundBlockComponent,
    ItemVisualBlockComponent,
    LeashableBlockComponent,
    LightDampeningBlockComponent,
    LightEmissionBlockComponent,
    LiquidDetectionBlockComponent,
    LootBlockComponent,
    MapColorBlockComponent,
    MaterialInstancesBlockComponent,
    MovableBlockComponent,
    MultiBlockBlockTrait,
    PlacementDirectionBlockTrait,
    PlacementFilterBlockComponent,
    PlacementPositionBlockTrait,
    PrecipitationInteractionsBlockComponent,
    RandomOffsetBlockComponent,
    RedstoneConductivityBlockComponent,
    RedstoneConsumerBlockComponent,
    RedstoneProducerBlockComponent,
    ReplaceableBlockComponent,
    SelectionBoxBlockComponent,
    SoundBlockComponent,
    SupportBlockComponent,
    TagsBlockComponent,
    TickBlockComponent,
    TransformationBlockComponent,
} from "#/block/index";
import { ComponentCollection } from "#/core/index";
import { Color, Range, Vec3 } from "#/primitive/index";

describe(Block.name, () => {
    test("minimal", (t) => {
        t.assert.snapshot(new Block("minimal"));
    });

    test("defaults explicit", (t) => {
        t.assert.snapshot(
            new Block("defaults", {
                category: "none",
                isHiddenInCommands: false,
                states: {},
                permutations: [],
            }),
        );
    });

    test("category only", (t) => {
        t.assert.snapshot(new Block("category", { category: "nature" }));
    });

    test("full", (t) => {
        t.assert.snapshot(
            new Block("full", {
                category: "construction",
                group: "minecraft:itemGroup.name.planks",
                isHiddenInCommands: true,
                states: {
                    "test:color": ["red", "green", "blue"],
                    "test:lit": [false, true],
                    "test:level": new Range(0, 7),
                },
            })
                .setState("test:count", 1, 2, 3)
                .setState("test:age", Range.from(4))
                .setTrait(
                    new PlacementDirectionBlockTrait({
                        enabledStates: ["minecraft:cardinal_direction"],
                        blocksToCornerWith: [],
                        yRotationOffset: "east",
                    }),
                    new PlacementPositionBlockTrait({
                        enabledStates: ["minecraft:vertical_half"],
                    }),
                )
                .setComponent(
                    new GeometryBlockComponent("geometry.test"),
                    new MaterialInstancesBlockComponent({ "*": { texture: "test" } }),
                    new CollisionBoxBlockComponent(BoundingBox.slab()),
                    new DestructibleByMiningBlockComponent({
                        secondsToDestroy: 2,
                        itemSpecificSpeeds: [],
                    }),
                    new FlammableBlockComponent(true),
                    new MapColorBlockComponent(new Color("#8f7748")),
                    new TickBlockComponent({ intervalRange: new Range(20, 40) }),
                    new FlammableBlockComponent({}), // replaces the previous flammable component
                )
                .pushPermutation(
                    "q.block_state('test:lit')",
                    new LightEmissionBlockComponent(15),
                    new TransformationBlockComponent({ rotation: new Vec3(0, 90, 0) }),
                )
                .pushPermutation("q.block_state('test:level') == 0"),
        );
    });

    describe("permutation", () => {
        test("with components", (t) => {
            t.assert.snapshot(
                new BlockPermutation(
                    "q.block_state('test:lit')",
                    new LightEmissionBlockComponent(15),
                    new FrictionBlockComponent(0.2),
                ),
            );
        });
    });
});

describe("components", () => {
    describe("block_entity", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new BlockEntityBlockComponent({
                        dynamicProperties: true,
                        container: { slotCount: 27 },
                        entityStorage: true,
                    }),
                ),
            );
        });
    });

    describe("chest_obstruction", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new ChestObstructionBlockComponent({ obstructionRule: "always" }),
                ),
            );
        });
    });

    describe("collision_box", () => {
        test("transparent true", (t) => {
            t.assert.snapshot(new ComponentCollection(new CollisionBoxBlockComponent(true)));
        });

        test("boxes instances", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new CollisionBoxBlockComponent(BoundingBox.cube(), BoundingBox.slab(), {
                        origin: new Vec3(-4, 2, -4),
                        size: new Vec3(8, 4, 8),
                    }),
                ),
            );
        });
    });

    describe("connection_rule", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new ConnectionRuleBlockComponent({
                        acceptsConnectionsFrom: "only_fences",
                        enabledDirections: ["north", "south"],
                    }),
                ),
            );
        });
    });

    describe("crafting_table", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new CraftingTableBlockComponent({
                        craftingTags: ["crafting_table", "test:workbench"],
                        tableName: "Test Workbench",
                    }),
                ),
            );
        });
    });

    describe("destructible_by_explosion", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new DestructibleByExplosionBlockComponent(true)),
            );
        });

        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new DestructibleByExplosionBlockComponent({
                        enabled: true,
                        explosionResistance: 30,
                    }),
                ),
            );
        });

        test("extra only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new DestructibleByExplosionBlockComponent({ explosionResistance: 12 }),
                ),
            );
        });
    });

    describe("destructible_by_mining", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new DestructibleByMiningBlockComponent(true)),
            );
        });

        test("transparent with extra", (t) => {
            const component = new DestructibleByMiningBlockComponent(true);
            component.secondsToDestroy = 2;
            t.assert.snapshot(new ComponentCollection(component));
        });

        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new DestructibleByMiningBlockComponent({
                        secondsToDestroy: 1.5,
                        itemSpecificSpeeds: [
                            { item: "minecraft:iron_pickaxe", destroySpeed: 0.5 },
                            { item: "minecraft:wooden_pickaxe", destroySpeed: 3 },
                        ],
                    }),
                ),
            );
        });
    });

    describe("destruction_particles", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new DestructionParticlesBlockComponent({
                        texture: "stone",
                        tintMethod: "grass",
                        particleCount: 50,
                    }),
                ),
            );
        });
    });

    describe("display_name", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new DisplayNameBlockComponent("tile.test:block.name")),
            );
        });
    });

    describe("embedded_visual", () => {
        test("geometry string", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new EmbeddedVisualBlockComponent({
                        geometry: "geometry.test",
                        materialInstances: new MaterialInstancesBlockComponent({
                            "*": { texture: "test_texture" },
                        }),
                    }),
                ),
            );
        });

        test("geometry component identifier only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new EmbeddedVisualBlockComponent({
                        geometry: new GeometryBlockComponent("geometry.test"),
                    }),
                ),
            );
        });

        test("geometry component full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new EmbeddedVisualBlockComponent({
                        geometry: new GeometryBlockComponent({
                            identifier: "geometry.test",
                            culling: "test:culling",
                            cullingShape: "test:shape",
                            cullingLayer: "minecraft:culling_layer.leaves",
                            boneVisibility: { lid: "q.block_state('test:open')", base: "true" },
                            uvLock: true,
                            nWayVisualRotation: { x: "test:x", y: "test:y", z: "test:z" },
                        }),
                        materialInstances: new MaterialInstancesBlockComponent({
                            "*": { texture: "test_texture" },
                        }),
                    }),
                ),
            );
        });
    });

    describe("entity_fall_on", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new EntityFallOnBlockComponent({ minFallDistance: 3 })),
            );
        });
    });

    describe("flammable", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(new ComponentCollection(new FlammableBlockComponent(true)));
        });

        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new FlammableBlockComponent({
                        enabled: true,
                        catchChanceModifier: 10,
                        destroyChanceModifier: 40,
                        lavaFlammable: "always",
                    }),
                ),
            );
        });

        test("extra only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new FlammableBlockComponent({ catchChanceModifier: 1 })),
            );
        });
    });

    describe("flower_pottable", () => {
        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new FlowerPottableBlockComponent()));
        });
    });

    describe("friction", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(new ComponentCollection(new FrictionBlockComponent(0.4)));
        });
    });

    describe("geometry", () => {
        test("keeps bone names", (t) => {
            const geometry = new GeometryBlockComponent({
                identifier: "geometry.chest",
                boneVisibility: { leftLid: "true" },
            });
            t.assert.snapshot(geometry);
        });

        test("transparent only", (t) => {
            t.assert.snapshot(new ComponentCollection(new GeometryBlockComponent("geometry.test")));
        });

        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new GeometryBlockComponent({
                        identifier: "geometry.test",
                        culling: "test:culling",
                        cullingShape: "test:shape",
                        cullingLayer: "minecraft:culling_layer.leaves",
                        boneVisibility: { lid: "q.block_state('test:open')", base: "true" },
                        uvLock: true,
                        nWayVisualRotation: { x: "test:x", y: "test:y", z: "test:z" },
                    }),
                ),
            );
        });

        test("uv lock array plain rotation", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new GeometryBlockComponent({
                        identifier: "geometry.test",
                        uvLock: ["up", "down"],
                        nWayVisualRotation: { y: "minecraft:cardinal_direction" },
                    }),
                ),
            );
        });
    });

    describe("instrument_sound", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new InstrumentSoundBlockComponent({
                        up: "note.bell",
                        down: "note.banjo",
                    }),
                ),
            );
        });
    });

    describe("item_visual", () => {
        test("geometry string", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new ItemVisualBlockComponent({
                        geometry: "geometry.test_item",
                        materialInstances: new MaterialInstancesBlockComponent({
                            "*": { texture: "test_texture" },
                        }),
                    }),
                ),
            );
        });

        test("geometry component full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new ItemVisualBlockComponent({
                        geometry: new GeometryBlockComponent({
                            identifier: "geometry.test",
                            culling: "test:culling",
                            cullingShape: "test:shape",
                            cullingLayer: "minecraft:culling_layer.leaves",
                            boneVisibility: { lid: "q.block_state('test:open')", base: "true" },
                            uvLock: true,
                            nWayVisualRotation: { x: "test:x", y: "test:y", z: "test:z" },
                        }),
                        materialInstances: new MaterialInstancesBlockComponent({
                            "*": { texture: "test_texture" },
                        }),
                    }),
                ),
            );
        });
    });

    describe("leashable", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new LeashableBlockComponent({ offset: new Vec3(0.5, 1, -0.5) }),
                ),
            );
        });
    });

    describe("light_dampening", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(new ComponentCollection(new LightDampeningBlockComponent(15)));
        });
    });

    describe("light_emission", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(new ComponentCollection(new LightEmissionBlockComponent(10)));
        });
    });

    describe("liquid_detection", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new LiquidDetectionBlockComponent({
                        detectionRules: [
                            {
                                liquidType: "water",
                                canContainLiquid: true,
                                onLiquidTouches: "popped",
                                stopsLiquidFlowingFromDirection: ["up", "north"],
                                useLiquidClipping: true,
                            },
                            {
                                liquidType: "water",
                                canContainLiquid: false,
                                onLiquidTouches: "no_reaction",
                            },
                        ],
                    }),
                ),
            );
        });
    });

    describe("loot", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new LootBlockComponent("loot_tables/blocks/test.json")),
            );
        });
    });

    describe("map_color", () => {
        test("transparent only rgb", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new MapColorBlockComponent(new Color(255, 0, 0))),
            );
        });

        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new MapColorBlockComponent({
                        color: new Color("#336699"),
                        tintMethod: "water",
                    }),
                ),
            );
        });
    });

    describe("material_instances", () => {
        test("keeps instance names, but snake_cases the instances", (t) => {
            const materials = new MaterialInstancesBlockComponent({
                sideFace: { texture: "oak", renderMethod: "blend" },
            });
            t.assert.snapshot(materials);
        });

        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new MaterialInstancesBlockComponent({
                        "*": {
                            texture: "test_side",
                            ambientOcclusion: 0.5,
                            renderMethod: "alpha_test",
                            tintMethod: "birch_foliage",
                            faceDimming: false,
                            isotropic: true,
                            alphaMaskedTint: true,
                        },
                        up: { texture: "test_top", renderMethod: "blend" },
                        down: { texture: "test_bottom" },
                    }),
                ),
            );
        });
    });

    describe("movable", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new MovableBlockComponent({ movementType: "push", sticky: "same" }),
                ),
            );
        });
    });

    describe("placement_filter", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new PlacementFilterBlockComponent(
                        {
                            allowedFaces: ["up", "down"],
                            blockFilter: [
                                "minecraft:dirt",
                                { name: "minecraft:stone", states: { stone_type: "granite" } },
                                { name: "minecraft:grass_block", states: {} },
                                { name: "minecraft:log", tags: "q.any_tag('wood')" },
                            ],
                        },
                        { allowedFaces: ["north"], blockFilter: ["minecraft:sand"] },
                    ),
                ),
            );
        });
    });

    describe("precipitation_interactions", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new PrecipitationInteractionsBlockComponent({
                        precipitationBehavior: "obstruct_rain_accumulate_snow",
                    }),
                ),
            );
        });
    });

    describe("random_offset", () => {
        test("writes ranges as objects, omitting unset ones", (t) => {
            t.assert.snapshot(new RandomOffsetBlockComponent({ x: { steps: 4 } }));
            t.assert.snapshot(new RandomOffsetBlockComponent({ x: { range: new Range(-1, 1) } }));
        });

        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new RandomOffsetBlockComponent({
                        x: { range: new Range(-4, 4), steps: 16 },
                        y: { range: new Range(0, 2) },
                        z: { range: new Range(-4, 4), steps: 8 },
                    }),
                ),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new RandomOffsetBlockComponent({})));
        });
    });

    describe("redstone_conductivity", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new RedstoneConductivityBlockComponent({
                        redstoneConductor: true,
                        allowsWireToStepDown: false,
                    }),
                ),
            );
        });
    });

    describe("redstone_consumer", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new RedstoneConsumerBlockComponent({ minPower: 5, propagatesPower: true }),
                ),
            );
        });
    });

    describe("redstone_producer", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new RedstoneProducerBlockComponent({
                        power: 15,
                        stronglyPoweredFace: "up",
                        connectedFaces: ["north", "up"],
                        transformRelative: false,
                    }),
                ),
            );
        });
    });

    describe("replaceable", () => {
        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new ReplaceableBlockComponent()));
        });
    });

    describe("selection_box", () => {
        test("transparent true", (t) => {
            t.assert.snapshot(new ComponentCollection(new SelectionBoxBlockComponent(true)));
        });

        test("box instance", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new SelectionBoxBlockComponent(BoundingBox.slab())),
            );
        });
    });

    describe("sound", () => {
        test("full", (t) => {
            t.assert.snapshot(new ComponentCollection(new SoundBlockComponent({ sound: "stone" })));
        });
    });

    describe("support", () => {
        test("full fence", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new SupportBlockComponent({ shape: "fence" })),
            );
        });
    });

    describe("tags", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new TagsBlockComponent({
                        value: ["minecraft:is_pickaxe_item_destructible", "test:tag"],
                    }),
                ),
            );
        });
    });

    describe("tick", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new TickBlockComponent({ intervalRange: new Range(10, 20), looping: false }),
                ),
            );
        });
    });

    describe("transformation", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new TransformationBlockComponent({
                        translation: new Vec3(1, 2, 3),
                        scale: new Vec3(0.5, 0.5, 0.5),
                        scalePivot: new Vec3(0, 0.5, 0),
                        rotation: new Vec3(0, 90, 0),
                        rotationPivot: new Vec3(0, 8, 0),
                    }),
                ),
            );
        });
    });

    describe("collection", () => {
        test("multiple", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new FrictionBlockComponent(0.1),
                    new LightEmissionBlockComponent(4),
                    new ReplaceableBlockComponent(),
                ),
            );
        });

        test("empty", (t) => {
            t.assert.snapshot(new ComponentCollection());
        });
    });
});

describe("traits", () => {
    describe("connection", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new BlockTraitCollection(
                    new ConnectionBlockTrait({
                        enabledStates: ["minecraft:cardinal_connections"],
                    }),
                ),
            );
        });
    });

    describe("multi_block", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new BlockTraitCollection(
                    new MultiBlockBlockTrait({
                        enabledStates: ["minecraft:multi_block_part"],
                        direction: "up",
                        parts: 3,
                    }),
                ),
            );
        });
    });

    describe("placement_direction", () => {
        describe("y rotation offset", () => {
            for (const direction of ["north", "east", "west"] as const) {
                test(direction, (t) => {
                    t.assert.snapshot(
                        new BlockTraitCollection(
                            new PlacementDirectionBlockTrait({
                                enabledStates: ["minecraft:corner_and_cardinal_direction"],
                                blocksToCornerWith: [],
                                yRotationOffset: direction,
                            }),
                        ),
                    );
                });
            }
        });

        test("full", (t) => {
            t.assert.snapshot(
                new BlockTraitCollection(
                    new PlacementDirectionBlockTrait({
                        enabledStates: [
                            "minecraft:cardinal_direction",
                            "minecraft:facing_direction",
                        ],
                        blocksToCornerWith: [
                            "minecraft:oak_stairs",
                            { name: "minecraft:stone", states: { stone_type: "granite" } },
                            { name: "minecraft:brick_stairs", states: {} },
                        ],
                        yRotationOffset: "south",
                    }),
                ),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(
                new BlockTraitCollection(
                    new PlacementDirectionBlockTrait({
                        enabledStates: ["minecraft:sixteen_way_rotation"],
                        blocksToCornerWith: [],
                    }),
                ),
            );
        });
    });

    describe("placement_position", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new BlockTraitCollection(
                    new PlacementPositionBlockTrait({
                        enabledStates: ["minecraft:block_face", "minecraft:vertical_half"],
                    }),
                ),
            );
        });
    });

    describe("collection", () => {
        test("multiple", (t) => {
            t.assert.snapshot(
                new BlockTraitCollection(
                    new PlacementPositionBlockTrait({
                        enabledStates: ["minecraft:block_face"],
                    }),
                    new ConnectionBlockTrait({
                        enabledStates: ["minecraft:cardinal_connections"],
                    }),
                ),
            );
        });
    });
});

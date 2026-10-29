import { describe, expect, test } from "vite-plus/test";

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
    test("minimal", () => {
        expect(new Block("minimal")).toMatchSnapshot();
    });

    test("defaults explicit", () => {
        expect(
            new Block("defaults", {
                category: "none",
                isHiddenInCommands: false,
                states: {},
                permutations: [],
            }),
        ).toMatchSnapshot();
    });

    test("category only", () => {
        expect(new Block("category", { category: "nature" })).toMatchSnapshot();
    });

    test("full", () => {
        expect(
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
        ).toMatchSnapshot();
    });

    describe("permutation", () => {
        test("with components", () => {
            expect(
                new BlockPermutation(
                    "q.block_state('test:lit')",
                    new LightEmissionBlockComponent(15),
                    new FrictionBlockComponent(0.2),
                ),
            ).toMatchSnapshot();
        });
    });
});

describe("components", () => {
    describe("block_entity", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new BlockEntityBlockComponent({
                        dynamicProperties: true,
                        container: { slotCount: 27 },
                        entityStorage: true,
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("chest_obstruction", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new ChestObstructionBlockComponent({ obstructionRule: "always" }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("collision_box", () => {
        test("transparent true", () => {
            expect(new ComponentCollection(new CollisionBoxBlockComponent(true))).toMatchSnapshot();
        });

        test("boxes instances", () => {
            expect(
                new ComponentCollection(
                    new CollisionBoxBlockComponent(BoundingBox.cube(), BoundingBox.slab(), {
                        origin: new Vec3(-4, 2, -4),
                        size: new Vec3(8, 4, 8),
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("connection_rule", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new ConnectionRuleBlockComponent({
                        acceptsConnectionsFrom: "only_fences",
                        enabledDirections: ["north", "south"],
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("crafting_table", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new CraftingTableBlockComponent({
                        craftingTags: ["crafting_table", "test:workbench"],
                        tableName: "Test Workbench",
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("destructible_by_explosion", () => {
        test("transparent only", () => {
            expect(
                new ComponentCollection(new DestructibleByExplosionBlockComponent(true)),
            ).toMatchSnapshot();
        });

        test("full", () => {
            expect(
                new ComponentCollection(
                    new DestructibleByExplosionBlockComponent({
                        enabled: true,
                        explosionResistance: 30,
                    }),
                ),
            ).toMatchSnapshot();
        });

        test("extra only", () => {
            expect(
                new ComponentCollection(
                    new DestructibleByExplosionBlockComponent({ explosionResistance: 12 }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("destructible_by_mining", () => {
        test("transparent only", () => {
            expect(
                new ComponentCollection(new DestructibleByMiningBlockComponent(true)),
            ).toMatchSnapshot();
        });

        test("transparent with extra", () => {
            const component = new DestructibleByMiningBlockComponent(true);
            component.secondsToDestroy = 2;
            expect(new ComponentCollection(component)).toMatchSnapshot();
        });

        test("full", () => {
            expect(
                new ComponentCollection(
                    new DestructibleByMiningBlockComponent({
                        secondsToDestroy: 1.5,
                        itemSpecificSpeeds: [
                            { item: "minecraft:iron_pickaxe", destroySpeed: 0.5 },
                            { item: "minecraft:wooden_pickaxe", destroySpeed: 3 },
                        ],
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("destruction_particles", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new DestructionParticlesBlockComponent({
                        texture: "stone",
                        tintMethod: "grass",
                        particleCount: 50,
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("display_name", () => {
        test("transparent only", () => {
            expect(
                new ComponentCollection(new DisplayNameBlockComponent("tile.test:block.name")),
            ).toMatchSnapshot();
        });
    });

    describe("embedded_visual", () => {
        test("geometry string", () => {
            expect(
                new ComponentCollection(
                    new EmbeddedVisualBlockComponent({
                        geometry: "geometry.test",
                        materialInstances: new MaterialInstancesBlockComponent({
                            "*": { texture: "test_texture" },
                        }),
                    }),
                ),
            ).toMatchSnapshot();
        });

        test("geometry component identifier only", () => {
            expect(
                new ComponentCollection(
                    new EmbeddedVisualBlockComponent({
                        geometry: new GeometryBlockComponent("geometry.test"),
                    }),
                ),
            ).toMatchSnapshot();
        });

        test("geometry component full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("entity_fall_on", () => {
        test("full", () => {
            expect(
                new ComponentCollection(new EntityFallOnBlockComponent({ minFallDistance: 3 })),
            ).toMatchSnapshot();
        });
    });

    describe("flammable", () => {
        test("transparent only", () => {
            expect(new ComponentCollection(new FlammableBlockComponent(true))).toMatchSnapshot();
        });

        test("full", () => {
            expect(
                new ComponentCollection(
                    new FlammableBlockComponent({
                        enabled: true,
                        catchChanceModifier: 10,
                        destroyChanceModifier: 40,
                        lavaFlammable: "always",
                    }),
                ),
            ).toMatchSnapshot();
        });

        test("extra only", () => {
            expect(
                new ComponentCollection(new FlammableBlockComponent({ catchChanceModifier: 1 })),
            ).toMatchSnapshot();
        });
    });

    describe("flower_pottable", () => {
        test("minimal", () => {
            expect(new ComponentCollection(new FlowerPottableBlockComponent())).toMatchSnapshot();
        });
    });

    describe("friction", () => {
        test("transparent only", () => {
            expect(new ComponentCollection(new FrictionBlockComponent(0.4))).toMatchSnapshot();
        });
    });

    describe("geometry", () => {
        test("keeps bone names", () => {
            const geometry = new GeometryBlockComponent({
                identifier: "geometry.chest",
                boneVisibility: { leftLid: "true" },
            });
            expect(geometry).toMatchSnapshot();
        });

        test("transparent only", () => {
            expect(
                new ComponentCollection(new GeometryBlockComponent("geometry.test")),
            ).toMatchSnapshot();
        });

        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });

        test("uv lock array plain rotation", () => {
            expect(
                new ComponentCollection(
                    new GeometryBlockComponent({
                        identifier: "geometry.test",
                        uvLock: ["up", "down"],
                        nWayVisualRotation: { y: "minecraft:cardinal_direction" },
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("instrument_sound", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new InstrumentSoundBlockComponent({
                        up: "note.bell",
                        down: "note.banjo",
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("item_visual", () => {
        test("geometry string", () => {
            expect(
                new ComponentCollection(
                    new ItemVisualBlockComponent({
                        geometry: "geometry.test_item",
                        materialInstances: new MaterialInstancesBlockComponent({
                            "*": { texture: "test_texture" },
                        }),
                    }),
                ),
            ).toMatchSnapshot();
        });

        test("geometry component full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("leashable", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new LeashableBlockComponent({ offset: new Vec3(0.5, 1, -0.5) }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("light_dampening", () => {
        test("transparent only", () => {
            expect(new ComponentCollection(new LightDampeningBlockComponent(15))).toMatchSnapshot();
        });
    });

    describe("light_emission", () => {
        test("transparent only", () => {
            expect(new ComponentCollection(new LightEmissionBlockComponent(10))).toMatchSnapshot();
        });
    });

    describe("liquid_detection", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("loot", () => {
        test("transparent only", () => {
            expect(
                new ComponentCollection(new LootBlockComponent("loot_tables/blocks/test.json")),
            ).toMatchSnapshot();
        });
    });

    describe("map_color", () => {
        test("transparent only rgb", () => {
            expect(
                new ComponentCollection(new MapColorBlockComponent(new Color(255, 0, 0))),
            ).toMatchSnapshot();
        });

        test("full", () => {
            expect(
                new ComponentCollection(
                    new MapColorBlockComponent({
                        color: new Color("#336699"),
                        tintMethod: "water",
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("material_instances", () => {
        test("keeps instance names, but snake_cases the instances", () => {
            const materials = new MaterialInstancesBlockComponent({
                sideFace: { texture: "oak", renderMethod: "blend" },
            });
            expect(materials).toMatchSnapshot();
        });

        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("movable", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new MovableBlockComponent({ movementType: "push", sticky: "same" }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("placement_filter", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("precipitation_interactions", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new PrecipitationInteractionsBlockComponent({
                        precipitationBehavior: "obstruct_rain_accumulate_snow",
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("random_offset", () => {
        test("writes ranges as objects, omitting unset ones", () => {
            expect(new RandomOffsetBlockComponent({ x: { steps: 4 } })).toMatchSnapshot();
            expect(
                new RandomOffsetBlockComponent({ x: { range: new Range(-1, 1) } }),
            ).toMatchSnapshot();
        });

        test("full", () => {
            expect(
                new ComponentCollection(
                    new RandomOffsetBlockComponent({
                        x: { range: new Range(-4, 4), steps: 16 },
                        y: { range: new Range(0, 2) },
                        z: { range: new Range(-4, 4), steps: 8 },
                    }),
                ),
            ).toMatchSnapshot();
        });

        test("minimal", () => {
            expect(new ComponentCollection(new RandomOffsetBlockComponent({}))).toMatchSnapshot();
        });
    });

    describe("redstone_conductivity", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new RedstoneConductivityBlockComponent({
                        redstoneConductor: true,
                        allowsWireToStepDown: false,
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("redstone_consumer", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new RedstoneConsumerBlockComponent({ minPower: 5, propagatesPower: true }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("redstone_producer", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new RedstoneProducerBlockComponent({
                        power: 15,
                        stronglyPoweredFace: "up",
                        connectedFaces: ["north", "up"],
                        transformRelative: false,
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("replaceable", () => {
        test("minimal", () => {
            expect(new ComponentCollection(new ReplaceableBlockComponent())).toMatchSnapshot();
        });
    });

    describe("selection_box", () => {
        test("transparent true", () => {
            expect(new ComponentCollection(new SelectionBoxBlockComponent(true))).toMatchSnapshot();
        });

        test("box instance", () => {
            expect(
                new ComponentCollection(new SelectionBoxBlockComponent(BoundingBox.slab())),
            ).toMatchSnapshot();
        });
    });

    describe("sound", () => {
        test("full", () => {
            expect(
                new ComponentCollection(new SoundBlockComponent({ sound: "stone" })),
            ).toMatchSnapshot();
        });
    });

    describe("support", () => {
        test("full fence", () => {
            expect(
                new ComponentCollection(new SupportBlockComponent({ shape: "fence" })),
            ).toMatchSnapshot();
        });
    });

    describe("tags", () => {
        test("transparent only", () => {
            expect(
                new ComponentCollection(
                    new TagsBlockComponent({
                        value: ["minecraft:is_pickaxe_item_destructible", "test:tag"],
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("tick", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new TickBlockComponent({ intervalRange: new Range(10, 20), looping: false }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("transformation", () => {
        test("full", () => {
            expect(
                new ComponentCollection(
                    new TransformationBlockComponent({
                        translation: new Vec3(1, 2, 3),
                        scale: new Vec3(0.5, 0.5, 0.5),
                        scalePivot: new Vec3(0, 0.5, 0),
                        rotation: new Vec3(0, 90, 0),
                        rotationPivot: new Vec3(0, 8, 0),
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("collection", () => {
        test("multiple", () => {
            expect(
                new ComponentCollection(
                    new FrictionBlockComponent(0.1),
                    new LightEmissionBlockComponent(4),
                    new ReplaceableBlockComponent(),
                ),
            ).toMatchSnapshot();
        });

        test("empty", () => {
            expect(new ComponentCollection()).toMatchSnapshot();
        });
    });
});

describe("traits", () => {
    describe("connection", () => {
        test("full", () => {
            expect(
                new BlockTraitCollection(
                    new ConnectionBlockTrait({
                        enabledStates: ["minecraft:cardinal_connections"],
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("multi_block", () => {
        test("full", () => {
            expect(
                new BlockTraitCollection(
                    new MultiBlockBlockTrait({
                        enabledStates: ["minecraft:multi_block_part"],
                        direction: "up",
                        parts: 3,
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("placement_direction", () => {
        describe("y rotation offset", () => {
            for (const direction of ["north", "east", "west"] as const) {
                test(direction, () => {
                    expect(
                        new BlockTraitCollection(
                            new PlacementDirectionBlockTrait({
                                enabledStates: ["minecraft:corner_and_cardinal_direction"],
                                blocksToCornerWith: [],
                                yRotationOffset: direction,
                            }),
                        ),
                    ).toMatchSnapshot();
                });
            }
        });

        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });

        test("minimal", () => {
            expect(
                new BlockTraitCollection(
                    new PlacementDirectionBlockTrait({
                        enabledStates: ["minecraft:sixteen_way_rotation"],
                        blocksToCornerWith: [],
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("placement_position", () => {
        test("full", () => {
            expect(
                new BlockTraitCollection(
                    new PlacementPositionBlockTrait({
                        enabledStates: ["minecraft:block_face", "minecraft:vertical_half"],
                    }),
                ),
            ).toMatchSnapshot();
        });
    });

    describe("collection", () => {
        test("multiple", () => {
            expect(
                new BlockTraitCollection(
                    new PlacementPositionBlockTrait({
                        enabledStates: ["minecraft:block_face"],
                    }),
                    new ConnectionBlockTrait({
                        enabledStates: ["minecraft:cardinal_connections"],
                    }),
                ),
            ).toMatchSnapshot();
        });
    });
});

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
import { Color, FormatVersion, Range, Vec3 } from "#/primitive/index";

describe("Block", () => {
    test("minimal", (t) => {
        t.assert.snapshot(new Block("test:minimal"));
    });

    test("explicit format version", (t) => {
        t.assert.snapshot(new Block("test:fv", { formatVersion: new FormatVersion(1, 21, 0) }));
    });

    test("defaults explicit", (t) => {
        t.assert.snapshot(
            new Block("test:defaults", {
                category: "none",
                isHiddenInCommands: false,
                states: {},
                permutations: [],
            }),
        );
    });

    test("category only", (t) => {
        t.assert.snapshot(new Block("test:category", { category: "nature" }));
    });

    test("full", (t) => {
        t.assert.snapshot(
            new Block("test:full", {
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

        test("without components", (t) => {
            t.assert.snapshot(new BlockPermutation("true"));
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

        test("plain container", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new BlockEntityBlockComponent({ container: { slotCount: 9 } }),
                ),
            );
        });

        test("empty container", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new BlockEntityBlockComponent({ container: {} })),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new BlockEntityBlockComponent({})));
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

        test("default value", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new ChestObstructionBlockComponent({ obstructionRule: "shape" }),
                ),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new ChestObstructionBlockComponent({})));
        });
    });

    describe("collision_box", () => {
        test("transparent true", (t) => {
            t.assert.snapshot(new ComponentCollection(new CollisionBoxBlockComponent(true)));
        });

        test("transparent false", (t) => {
            t.assert.snapshot(new ComponentCollection(new CollisionBoxBlockComponent(false)));
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

        test("boxes plain", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new CollisionBoxBlockComponent({
                        origin: new Vec3(-2, 0, -2),
                        size: new Vec3(4, 16, 4),
                    }),
                ),
            );
        });

        test("add box to boolean", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new CollisionBoxBlockComponent(true).addBox(BoundingBox.slab()),
                ),
            );
        });

        test("add box to array", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new CollisionBoxBlockComponent(BoundingBox.cube()).addBox(BoundingBox.slab()),
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new ConnectionRuleBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new CraftingTableBlockComponent({})));
        });
    });

    describe("destructible_by_explosion", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new DestructibleByExplosionBlockComponent(true)),
            );
        });

        test("transparent only false", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new DestructibleByExplosionBlockComponent(false)),
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

        test("empty", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new DestructibleByExplosionBlockComponent({})),
            );
        });
    });

    describe("destructible_by_mining", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new DestructibleByMiningBlockComponent(true)),
            );
        });

        test("transparent only false", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new DestructibleByMiningBlockComponent(false)),
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

        test("empty", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new DestructibleByMiningBlockComponent({ itemSpecificSpeeds: [] }),
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new DestructionParticlesBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new EmbeddedVisualBlockComponent({})));
        });
    });

    describe("entity_fall_on", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new EntityFallOnBlockComponent({ minFallDistance: 3 })),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new EntityFallOnBlockComponent({})));
        });
    });

    describe("flammable", () => {
        test("transparent only", (t) => {
            t.assert.snapshot(new ComponentCollection(new FlammableBlockComponent(true)));
        });

        test("transparent only false", (t) => {
            t.assert.snapshot(new ComponentCollection(new FlammableBlockComponent(false)));
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

        test("defaults only", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new FlammableBlockComponent({
                        catchChanceModifier: 5,
                        destroyChanceModifier: 20,
                    }),
                ),
            );
        });

        test("empty", (t) => {
            t.assert.snapshot(new ComponentCollection(new FlammableBlockComponent({})));
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

        test("defaults explicit", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new GeometryBlockComponent({
                        identifier: "geometry.test",
                        uvLock: false,
                        boneVisibility: {},
                    }),
                ),
            );
        });

        test("empty", (t) => {
            t.assert.snapshot(new ComponentCollection(new GeometryBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new InstrumentSoundBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new ItemVisualBlockComponent({})));
        });
    });

    describe("leashable", () => {
        test("omits unset value fields", (t) => {
            t.assert.snapshot(new LeashableBlockComponent({}));
            t.assert.snapshot(new LeashableBlockComponent({ offset: new Vec3(1, 2, 3) }));
        });

        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new LeashableBlockComponent({ offset: new Vec3(0.5, 1, -0.5) }),
                ),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new LeashableBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new LiquidDetectionBlockComponent({ detectionRules: [] })),
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
        test("is transparent on its color", (t) => {
            // With no field set, nothing collapses and the component is an empty object.
            t.assert.snapshot(new MapColorBlockComponent({}));
            t.assert.snapshot(new MapColorBlockComponent(new Color(1, 2, 16)));
        });

        test("transparent only rgb", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new MapColorBlockComponent(new Color(255, 0, 0))),
            );
        });

        test("transparent only rgba", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new MapColorBlockComponent(new Color("#ff000080"))),
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

        test("empty", (t) => {
            t.assert.snapshot(new ComponentCollection(new MapColorBlockComponent({})));
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

        test("defaults explicit", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new MaterialInstancesBlockComponent({
                        "*": {
                            texture: "test",
                            ambientOcclusion: 1,
                            renderMethod: "opaque",
                            tintMethod: "none",
                            faceDimming: true,
                            isotropic: false,
                            alphaMaskedTint: false,
                        },
                    }),
                ),
            );
        });

        test("empty", (t) => {
            t.assert.snapshot(new ComponentCollection(new MaterialInstancesBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new MovableBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new PlacementFilterBlockComponent()));
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

        test("minimal", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new PrecipitationInteractionsBlockComponent({})),
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new RedstoneConductivityBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new RedstoneConsumerBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new RedstoneProducerBlockComponent({})));
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

        test("transparent false", (t) => {
            t.assert.snapshot(new ComponentCollection(new SelectionBoxBlockComponent(false)));
        });

        test("box instance", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new SelectionBoxBlockComponent(BoundingBox.slab())),
            );
        });

        test("box plain", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new SelectionBoxBlockComponent({
                        origin: new Vec3(-8, 0, -8),
                        size: new Vec3(16, 4, 16),
                    }),
                ),
            );
        });
    });

    describe("sound", () => {
        test("full", (t) => {
            t.assert.snapshot(new ComponentCollection(new SoundBlockComponent({ sound: "stone" })));
        });

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new SoundBlockComponent({})));
        });
    });

    describe("support", () => {
        test("full fence", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new SupportBlockComponent({ shape: "fence" })),
            );
        });

        test("full stair", (t) => {
            t.assert.snapshot(
                new ComponentCollection(new SupportBlockComponent({ shape: "stair" })),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new SupportBlockComponent({})));
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

        test("empty", (t) => {
            t.assert.snapshot(new ComponentCollection(new TagsBlockComponent({})));
        });
    });

    describe("tick", () => {
        test("omits unset value fields", (t) => {
            t.assert.snapshot(new TickBlockComponent({}));
            t.assert.snapshot(new TickBlockComponent({ intervalRange: new Range(10, 20) }));
        });

        test("full", (t) => {
            t.assert.snapshot(
                new ComponentCollection(
                    new TickBlockComponent({ intervalRange: new Range(10, 20), looping: false }),
                ),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new TickBlockComponent({})));
        });
    });

    describe("transformation", () => {
        test("omits unset value fields", (t) => {
            t.assert.snapshot(new TransformationBlockComponent({}));
            t.assert.snapshot(new TransformationBlockComponent({ rotation: new Vec3(0, 90, 0) }));
        });

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

        test("minimal", (t) => {
            t.assert.snapshot(new ComponentCollection(new TransformationBlockComponent({})));
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

        test("minimal", (t) => {
            t.assert.snapshot(
                new BlockTraitCollection(new ConnectionBlockTrait({ enabledStates: [] })),
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

        test("minimal", (t) => {
            t.assert.snapshot(
                new BlockTraitCollection(
                    new MultiBlockBlockTrait({
                        enabledStates: ["minecraft:multi_block_part"],
                        direction: "down",
                    }),
                ),
            );
        });
    });

    describe("placement_direction", () => {
        for (const direction of ["north", "east", "west"] as const) {
            test(`y rotation offset ${direction}`, (t) => {
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

        test("minimal", (t) => {
            t.assert.snapshot(
                new BlockTraitCollection(new PlacementPositionBlockTrait({ enabledStates: [] })),
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

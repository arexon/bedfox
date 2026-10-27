import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
    AggregateFeature,
    BiomeFilter,
    BiomeFilterMulti,
    BiomeFilterSingle,
    CaveCarverFeature,
    ConditionalListFeature,
    FeatureRules,
    FossilFeature,
    GeodeFeature,
    GrowingPlantFeature,
    HeightDifferenceFilterFeature,
    HorizontalTreeDecorationFeature,
    MultiBlockFeature,
    MultifaceFeature,
    MultipartBlockColumnFeature,
    NetherCaveCarverFeature,
    OreFeature,
    PartiallyExposedBlobFeature,
    ScatterFeature,
    SearchFeature,
    SequenceFeature,
    SingleBlockFeature,
    SnapToSurfaceFeature,
    StructureTemplateFeature,
    SurfaceRelativeThresholdFeature,
    UnderwaterCaveCarverFeature,
    VegetationPatchFeature,
    WeightedRandomFeature,
} from "#/feature/index";
import { Range, Vec3 } from "#/primitive/index";

describe(BiomeFilter.name, () => {
    test("single", (t) => {
        t.assert.snapshot(new BiomeFilter().hasTag("forest"));
    });

    test("multiple", (t) => {
        t.assert.snapshot(
            new BiomeFilter()
                .hasTag("overworld")
                .isBiome("minecraft:plains")
                .isSnowCovered()
                .isHumid(false)
                .isTemperatureType("cold")
                .isTemperatureValue("0.5"),
        );
    });

    test("all of any of", (t) => {
        t.assert.snapshot(
            new BiomeFilter()
                .allOf((b) => b.hasTag("overworld").isSnowCovered(false))
                .anyOf((b) => b.hasTag("forest").hasTag("taiga")),
        );
    });

    describe("not", () => {
        test("negates a test", (t) => {
            t.assert.snapshot(new BiomeFilter().not.hasTag("ocean"));
        });

        test("only negates the next test", (t) => {
            t.assert.snapshot(new BiomeFilter().not.hasTag("ocean").hasTag("forest"));
        });

        test("is only followed by a test", () => {
            const filter = new BiomeFilter();
            // @ts-expect-error groups can't be negated
            assert.throws(() => filter.not.allOf(() => {}), TypeError);
            // @ts-expect-error double negation
            assert.equal(filter.not.not, undefined);
        });
    });

    test("empty", (t) => {
        t.assert.snapshot(new BiomeFilter());
    });

    describe("direct", () => {
        test("single", (t) => {
            t.assert.snapshot(new BiomeFilterSingle("is_biome", "!=", "minecraft:desert"));
        });

        test("multi", (t) => {
            t.assert.snapshot(
                new BiomeFilterMulti({
                    anyOf: [new BiomeFilterSingle("has_biome_tag", "==", "hills")],
                    allOf: [new BiomeFilterSingle("is_humid", "!=", "true")],
                }),
            );
        });
    });
});

describe("features", () => {
    describe("aggregate", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new AggregateFeature("aggregate", {
                    features: [
                        new OreFeature("live_ore", { count: 4 }).add("minecraft:diamond_ore", [
                            "minecraft:stone",
                        ]),
                        "test:string_feature",
                        new SequenceFeature("live_sequence", { features: [] }),
                    ],
                    earlyOut: "first_success",
                }),
            );
        });
    });

    describe("cave_carver", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new CaveCarverFeature("cave_carver", {
                    fillWith: "minecraft:air",
                    widthModifier: "q.noise(1, 2)",
                    skipCarveChance: 15,
                    heightLimit: 64,
                    yScale: new Range(0.1, 0.9),
                    horizontalRadiusMultiplier: new Range(0.7, 1.4),
                    verticalRadiusMultiplier: 1.2,
                    floorLevel: new Range(-1, -0.4),
                }),
            );
        });
    });

    describe("conditional_list", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ConditionalListFeature("conditional", {
                    features: [{ placesFeature: "test:live_ore", condition: "q.is_snow_covered" }],
                    earlyOut: "placement_success",
                })
                    .add("test:string_feature")
                    .add(new SequenceFeature("live_sequence", { features: [] }), "v.x > 0"),
            );
        });
    });

    describe("fossil", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new FossilFeature("fossil", {
                    oreBlock: "minecraft:coal_ore",
                    maxEmptyCorners: 4,
                }),
            );
        });
    });

    describe("geode", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new GeodeFeature("geode", {
                    filler: "minecraft:air",
                    innerLayer: "minecraft:amethyst_block",
                    alternateInnerLayer: "minecraft:budding_amethyst",
                    middleLayer: "minecraft:calcite",
                    outerLayer: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    innerPlacements: [
                        "minecraft:amethyst_cluster",
                        {
                            name: "minecraft:small_amethyst_bud",
                            states: { facing: "up" },
                        },
                    ],
                    minOuterWallDistance: 4,
                    maxOuterWallDistance: 7,
                    minDistributionPoints: 3,
                    maxDistributionPoints: 5,
                    minPointOffset: 1,
                    maxPointOffset: 3,
                    maxRadius: 16,
                    crackPointOffset: 2,
                    generateCrackChance: 0.95,
                    baseCrackSize: 2,
                    noiseMultiplier: 0.025,
                    usePotentialPlacementsChance: 0.35,
                    useAlternateLayer0Chance: 0.083,
                    placementsRequireLayer0Alternate: true,
                    invalidBlocksThreshold: 1,
                }),
            );
        });
    });

    describe("growing_plant", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new GrowingPlantFeature("growing_plant", {
                    heightDistribution: [
                        [new Range(1, 13), 2],
                        [3, 1],
                    ],
                    growthDirection: "down",
                    age: new Range(17, 26),
                    bodyBlocks: [
                        ["minecraft:cave_vines", 4],
                        [{ name: "minecraft:stone", states: { stone_type: "granite" } }, 1],
                    ],
                    headBlocks: [["minecraft:cave_vines_head_with_berries", 1]],
                    allowWater: true,
                }),
            );
        });
    });

    describe("height_difference_filter", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new HeightDifferenceFilterFeature("hdf", {
                    placesFeature: "test:live_ore",
                    searchRadius: 3,
                    minRequiredUpwardHeightDiff: 1,
                    minRequiredDownwardHeightDiff: 2,
                    maxAllowedUpwardHeightDiff: 5,
                    maxAllowedDownwardHeightDiff: 6,
                }),
            );
        });
    });

    describe("horizontal_tree_decoration", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new HorizontalTreeDecorationFeature("htd", {
                    placesBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    allowAdjacent: true,
                    barkSideOnly: false,
                }),
            );
        });
    });

    describe("multi_block", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new MultiBlockFeature("multi_block", {
                    placesBlock: "minecraft:tall_grass",
                    enforcePlacementRules: true,
                    randomizeRotation: false,
                    mayReplace: [
                        "minecraft:air",
                        { name: "minecraft:stone", states: { stone_type: "granite" } },
                    ],
                }),
            );
        });
    });

    describe("multiface", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new MultifaceFeature("multiface", {
                    placesBlock: "minecraft:glow_lichen",
                    searchRange: 20,
                    canPlaceOnFloor: true,
                    canPlaceOnCeiling: true,
                    canPlaceOnWall: false,
                    chanceOfSpreading: 0.5,
                    canPlaceOn: [
                        "minecraft:stone",
                        { name: "minecraft:stone", states: { stone_type: "granite" } },
                    ],
                }),
            );
        });
    });

    describe("multipart_block_column", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new MultipartBlockColumnFeature("column", {
                    tipBlock: "minecraft:pointed_dripstone",
                    frustumBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    middleBlock: "minecraft:dripstone_block",
                    baseBlock: "minecraft:dripstone_block",
                    heightRange: new Range(2, 6),
                    weightedHeights: [1, 2, 3],
                    direction: "up",
                    mayPlaceOn: ["minecraft:stone"],
                    mayReplace: [
                        "minecraft:air",
                        { name: "minecraft:stone", states: { stone_type: "granite" } },
                    ],
                }),
            );
        });
    });

    describe("nether_cave_carver", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new NetherCaveCarverFeature("nether_carver", {
                    fillWith: "minecraft:air",
                    widthModifier: "q.noise(1, 2)",
                    skipCarveChance: 15,
                    heightLimit: 64,
                    yScale: new Range(0.1, 0.9),
                    horizontalRadiusMultiplier: new Range(0.7, 1.4),
                    verticalRadiusMultiplier: 1.2,
                    floorLevel: new Range(-1, -0.4),
                }),
            );
        });
    });

    describe("ore", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new OreFeature("ore", {
                    count: 8,
                    discardChanceOnAirExposure: 0.5,
                    replaceRules: [
                        {
                            placesBlock: "minecraft:iron_ore",
                            mayReplace: [
                                "minecraft:stone",
                                { name: "minecraft:stone", states: { stone_type: "granite" } },
                            ],
                        },
                        {
                            placesBlock: {
                                name: "minecraft:stone",
                                states: { stone_type: "granite" },
                            },
                        },
                    ],
                })
                    .add("minecraft:deepslate_iron_ore", ["minecraft:deepslate"])
                    .add("minecraft:gold_ore"),
            );
        });
    });

    describe("partially_exposed_blob", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new PartiallyExposedBlobFeature("blob", {
                    placesBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    placementRadiusAroundFloor: 2,
                    placementProbabilityPerValidPosition: 0.5,
                    exposedFace: "up",
                }),
            );
        });
    });

    describe("scatter", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ScatterFeature("scatter", {
                    placesFeature: "test:live_ore",
                    iterations: "math.random_integer(1, 4)",
                    x: { distribution: "uniform", extent: ["0", "16"] },
                    y: "q.heightmap(v.worldx, v.worldz)",
                    z: {
                        distribution: "fixed_grid",
                        extent: ["0", "15"],
                        gridOffset: 1,
                        stepSize: 2,
                    },
                    coordinateEvalOrder: "zyx",
                    scatterChance: { numerator: 1, denominator: 4 },
                    projectInputToFloor: true,
                }),
            );
        });
    });

    describe("search", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SearchFeature("search", {
                    placesFeature: "test:live_ore",
                    searchVolume: { min: new Vec3(-3, -3, -3), max: new Vec3(3, 3, 3) },
                    searchAxis: "-y",
                    requiredSuccesses: 2,
                }),
            );
        });
    });

    describe("sequence", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SequenceFeature("sequence", {
                    features: [
                        "test:live_ore",
                        "test:string_feature",
                        new AggregateFeature("live_aggregate", { features: [] }),
                    ],
                }),
            );
        });
    });

    describe("single_block", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SingleBlockFeature("single", {
                    placesBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    enforcePlacementRules: true,
                    enforceSurvivabilityRules: false,
                    randomizeRotation: true,
                    mayAttachTo: {
                        minSidesMustAttach: 1,
                        autoRotate: true,
                        top: "minecraft:stone",
                        bottom: [
                            "minecraft:dirt",
                            { name: "minecraft:stone", states: { stone_type: "granite" } },
                        ],
                        north: "a:n",
                        east: "a:e",
                        south: "a:s",
                        west: "a:w",
                        all: ["minecraft:air"],
                        sides: { name: "minecraft:stone", states: { stone_type: "granite" } },
                        diagonal: "a:d",
                    },
                    mayNotAttachTo: { top: "minecraft:bedrock" },
                    mayReplace: [
                        "minecraft:air",
                        { name: "minecraft:stone", states: { stone_type: "granite" } },
                    ],
                }),
            );
        });

        test("weighted", (t) => {
            t.assert.snapshot(
                new SingleBlockFeature("single_weighted", {
                    placesBlock: [
                        { weight: 2, block: "minecraft:poppy" },
                        {
                            weight: 1,
                            block: { name: "minecraft:stone", states: { stone_type: "granite" } },
                        },
                        { block: "minecraft:dandelion", weight: 3 },
                    ],
                }),
            );
        });
    });

    describe("snap_to_surface", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SnapToSurfaceFeature("snap", {
                    featureToSnap: "test:live_ore",
                    searchRange: 12,
                    surface: "ceiling",
                    allowAirPlacement: false,
                    allowNonAirPlacement: true,
                    allowUnderwaterPlacement: true,
                    allowedSurfaceBlocks: [
                        "minecraft:stone",
                        { name: "minecraft:stone", states: { stone_type: "granite" } },
                        { name: "minecraft:grass_block", states: {} },
                        { name: "minecraft:log", tags: "q.any_tag('wood')" },
                    ],
                    embedInSurface: true,
                }),
            );
        });
    });

    describe("structure_template", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new StructureTemplateFeature("structure", {
                    structureName: "mystructure:house",
                    grounded: true,
                    unburied: true,
                    leveled: { maxSteepness: 2 },
                    blockIntersection: {
                        onlyCheckIntersectionForMotionBlockingBlocks: true,
                        blockAllowlist: [
                            "minecraft:air",
                            { name: "minecraft:stone", states: { stone_type: "granite" } },
                        ],
                    },
                    adjustmentRadius: 4,
                    facingDirection: "random",
                    rotateAroundCenter: true,
                    groundLevel: 1,
                }),
            );
        });

        test("boolean constraints", (t) => {
            t.assert.snapshot(
                new StructureTemplateFeature("structure_bool", {
                    structureName: "mystructure:hut",
                    grounded: false,
                    unburied: true,
                    leveled: true,
                    blockIntersection: true,
                }),
            );
        });

        test("empty constraint objects", (t) => {
            t.assert.snapshot(
                new StructureTemplateFeature("structure_empty", {
                    structureName: "mystructure:tower",
                    leveled: {},
                    blockIntersection: {},
                }),
            );
        });
    });

    describe("surface_relative_threshold", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SurfaceRelativeThresholdFeature("srt", {
                    featureToPlace: "test:live_ore",
                    minimumDistanceBelowSurface: 4,
                }),
            );
        });
    });

    describe("underwater_cave_carver", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new UnderwaterCaveCarverFeature("uw_carver", {
                    fillWith: "minecraft:air",
                    widthModifier: "q.noise(1, 2)",
                    skipCarveChance: 15,
                    heightLimit: 64,
                    yScale: new Range(0.1, 0.9),
                    horizontalRadiusMultiplier: new Range(0.7, 1.4),
                    verticalRadiusMultiplier: 1.2,
                    floorLevel: new Range(-1, -0.4),
                    replaceAirWith: { name: "minecraft:stone", states: { stone_type: "granite" } },
                }),
            );
        });
    });

    describe("vegetation_patch", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new VegetationPatchFeature("veg", {
                    replaceableBlocks: [
                        "minecraft:stone",
                        { name: "minecraft:stone", states: { stone_type: "granite" } },
                    ],
                    groundBlock: "minecraft:moss_block",
                    vegetationFeature: "test:live_ore",
                    surface: "ceiling",
                    depth: new Range(1, 2),
                    extraDeepBlockChance: 0.2,
                    verticalRange: 5,
                    vegetationChance: 0.8,
                    horizontalRadius: new Range(4, 7),
                    extraEdgeColumnChance: 0.3,
                    waterlogged: true,
                }),
            );
        });
    });

    describe("weighted_random", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new WeightedRandomFeature("weighted", {
                    features: [["test:live_ore", 3]],
                })
                    .add("test:string_feature", 1)
                    .add(new SequenceFeature("live_sequence", { features: [] }), 0.5),
            );
        });
    });
});

describe(FeatureRules.name, () => {
    test("full instance", (t) => {
        t.assert.snapshot(
            new FeatureRules("rules", {
                placesFeature: new OreFeature("live_ore", { count: 4 }),
                placementPass: "underground_pass",
                biomeFilter: new BiomeFilter()
                    .hasTag("overworld")
                    .anyOf((b) => b.hasTag("hills").isBiome("minecraft:plains")),
                iterations: "4",
                x: { distribution: "uniform", extent: ["0", "16"] },
                y: {
                    distribution: "triangle",
                    extent: ["0", "q.heightmap(v.worldx, v.worldz)"],
                },
                z: "v.worldz",
                coordinateEvalOrder: "yxz",
                scatterChance: { numerator: 1, denominator: 3 },
            }),
        );
    });

    test("empty biome filter", (t) => {
        t.assert.snapshot(
            new FeatureRules("rules_empty_filter", {
                placesFeature: "test:string_feature",
                biomeFilter: new BiomeFilter(),
            }),
        );
    });
});

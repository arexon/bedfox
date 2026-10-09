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

describe("BiomeFilter", () => {
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

    test("not", (t) => {
        t.assert.snapshot(new BiomeFilter().not().hasTag("ocean"));
    });

    test("empty", (t) => {
        t.assert.snapshot(new BiomeFilter());
    });

    test("single direct", (t) => {
        t.assert.snapshot(new BiomeFilterSingle("is_biome", "!=", "minecraft:desert"));
    });

    test("multi direct", (t) => {
        t.assert.snapshot(
            new BiomeFilterMulti({
                anyOf: [new BiomeFilterSingle("has_biome_tag", "==", "hills")],
                allOf: [new BiomeFilterSingle("is_humid", "!=", "true")],
            }),
        );
    });
});

describe("features", () => {
    describe("aggregate", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new AggregateFeature("test:aggregate", {
                    features: [
                        new OreFeature("test:live_ore", { count: 4 }).add("minecraft:diamond_ore", [
                            "minecraft:stone",
                        ]),
                        "test:string_feature",
                        new SequenceFeature("test:live_sequence", { features: [] }),
                    ],
                    earlyOut: "first_success",
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new AggregateFeature("test:aggregate_min", { features: [] }));
        });
    });

    describe("cave_carver", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new CaveCarverFeature("test:cave_carver", {
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

        test("descriptor fill", (t) => {
            t.assert.snapshot(
                new CaveCarverFeature("test:cave_carver_desc", {
                    fillWith: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    yScale: 0.5,
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new CaveCarverFeature("test:cave_carver_min"));
        });
    });

    describe("conditional_list", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ConditionalListFeature("test:conditional", {
                    features: [{ placesFeature: "test:live_ore", condition: "q.is_snow_covered" }],
                    earlyOut: "placement_success",
                })
                    .add("test:string_feature")
                    .add(new SequenceFeature("test:live_sequence", { features: [] }), "v.x > 0"),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new ConditionalListFeature("test:conditional_min"));
        });
    });

    describe("fossil", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new FossilFeature("test:fossil", {
                    oreBlock: "minecraft:coal_ore",
                    maxEmptyCorners: 4,
                }),
            );
        });

        test("descriptor", (t) => {
            t.assert.snapshot(
                new FossilFeature("test:fossil_desc", {
                    oreBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    maxEmptyCorners: 0,
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new FossilFeature("test:fossil_min"));
        });
    });

    describe("geode", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new GeodeFeature("test:geode", {
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

        test("minimal", (t) => {
            t.assert.snapshot(new GeodeFeature("test:geode_min"));
        });
    });

    describe("growing_plant", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new GrowingPlantFeature("test:growing_plant", {
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

        test("age number", (t) => {
            t.assert.snapshot(
                new GrowingPlantFeature("test:growing_plant_num", {
                    heightDistribution: [[5, 1]],
                    growthDirection: "up",
                    age: 3,
                    bodyBlocks: [],
                    headBlocks: [],
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(
                new GrowingPlantFeature("test:growing_plant_min", { heightDistribution: [] }),
            );
        });
    });

    describe("height_difference_filter", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new HeightDifferenceFilterFeature("test:hdf", {
                    placesFeature: "test:live_ore",
                    searchRadius: 3,
                    minRequiredUpwardHeightDiff: 1,
                    minRequiredDownwardHeightDiff: 2,
                    maxAllowedUpwardHeightDiff: 5,
                    maxAllowedDownwardHeightDiff: 6,
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(
                new HeightDifferenceFilterFeature("test:hdf_min", {
                    placesFeature: "test:string_feature",
                }),
            );
        });
    });

    describe("horizontal_tree_decoration", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new HorizontalTreeDecorationFeature("test:htd", {
                    placesBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    allowAdjacent: true,
                    barkSideOnly: false,
                }),
            );
        });

        test("string", (t) => {
            t.assert.snapshot(
                new HorizontalTreeDecorationFeature("test:htd_str", {
                    placesBlock: "minecraft:cocoa",
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new HorizontalTreeDecorationFeature("test:htd_min"));
        });
    });

    describe("multi_block", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new MultiBlockFeature("test:multi_block", {
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

        test("minimal", (t) => {
            t.assert.snapshot(new MultiBlockFeature("test:multi_block_min"));
        });
    });

    describe("multiface", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new MultifaceFeature("test:multiface", {
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

        test("minimal", (t) => {
            t.assert.snapshot(new MultifaceFeature("test:multiface_min"));
        });
    });

    describe("multipart_block_column", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new MultipartBlockColumnFeature("test:column", {
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

        test("height number", (t) => {
            t.assert.snapshot(
                new MultipartBlockColumnFeature("test:column_num", {
                    tipBlock: "a:a",
                    frustumBlock: "a:b",
                    middleBlock: "a:c",
                    baseBlock: "a:d",
                    heightRange: 4,
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new MultipartBlockColumnFeature("test:column_min"));
        });
    });

    describe("nether_cave_carver", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new NetherCaveCarverFeature("test:nether_carver", {
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

        test("minimal", (t) => {
            t.assert.snapshot(new NetherCaveCarverFeature("test:nether_carver_min"));
        });
    });

    describe("ore", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new OreFeature("test:ore", {
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

        test("minimal", (t) => {
            t.assert.snapshot(new OreFeature("test:ore_min"));
        });
    });

    describe("partially_exposed_blob", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new PartiallyExposedBlobFeature("test:blob", {
                    placesBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    placementRadiusAroundFloor: 2,
                    placementProbabilityPerValidPosition: 0.5,
                    exposedFace: "up",
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new PartiallyExposedBlobFeature("test:blob_min"));
        });
    });

    describe("scatter", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new ScatterFeature("test:scatter", {
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

        test("plain distribution", (t) => {
            t.assert.snapshot(
                new ScatterFeature("test:scatter_plain", {
                    placesFeature: "test:string_feature",
                    x: { distribution: "gaussian", extent: ["0", "15"] },
                    scatterChance: { numerator: 1, denominator: 2 },
                    coordinateEvalOrder: "xzy",
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(
                new ScatterFeature("test:scatter_min", { placesFeature: "test:string_feature" }),
            );
        });
    });

    describe("search", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SearchFeature("test:search", {
                    placesFeature: "test:live_ore",
                    searchVolume: { min: new Vec3(-3, -3, -3), max: new Vec3(3, 3, 3) },
                    searchAxis: "-y",
                    requiredSuccesses: 2,
                }),
            );
        });

        test("plain volume", (t) => {
            t.assert.snapshot(
                new SearchFeature("test:search_plain", {
                    placesFeature: "test:string_feature",
                    searchVolume: { min: new Vec3(0, 0, 0), max: new Vec3(1, 1, 1) },
                    searchAxis: "+x",
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(
                new SearchFeature("test:search_min", { placesFeature: "test:string_feature" }),
            );
        });
    });

    describe("sequence", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SequenceFeature("test:sequence", {
                    features: [
                        "test:live_ore",
                        "test:string_feature",
                        new AggregateFeature("test:live_aggregate", { features: [] }),
                    ],
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new SequenceFeature("test:sequence_min", { features: [] }));
        });
    });

    describe("single_block", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SingleBlockFeature("test:single", {
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
                new SingleBlockFeature("test:single_weighted", {
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

        test("string", (t) => {
            t.assert.snapshot(
                new SingleBlockFeature("test:single_str", { placesBlock: "minecraft:stone" }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new SingleBlockFeature("test:single_min"));
        });
    });

    describe("snap_to_surface", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SnapToSurfaceFeature("test:snap", {
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

        test("defaults explicit", (t) => {
            t.assert.snapshot(
                new SnapToSurfaceFeature("test:snap_defaults", {
                    featureToSnap: "test:string_feature",
                    searchRange: 4,
                    allowAirPlacement: true,
                    allowNonAirPlacement: false,
                    allowUnderwaterPlacement: false,
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(
                new SnapToSurfaceFeature("test:snap_min", { featureToSnap: "test:string_feature" }),
            );
        });
    });

    describe("structure_template", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new StructureTemplateFeature("test:structure", {
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
                new StructureTemplateFeature("test:structure_bool", {
                    structureName: "mystructure:hut",
                    grounded: false,
                    unburied: true,
                    leveled: true,
                    blockIntersection: true,
                }),
            );
        });

        test("plain constraints", (t) => {
            t.assert.snapshot(
                new StructureTemplateFeature("test:structure_plain", {
                    structureName: "mystructure:tower",
                    leveled: { maxSteepness: 1 },
                    blockIntersection: { blockAllowlist: ["minecraft:water"] },
                    facingDirection: "north",
                }),
            );
        });

        test("empty constraint objects", (t) => {
            t.assert.snapshot(
                new StructureTemplateFeature("test:structure_empty", {
                    structureName: "mystructure:tower",
                    leveled: {},
                    blockIntersection: {},
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new StructureTemplateFeature("test:structure_min"));
        });
    });

    describe("surface_relative_threshold", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new SurfaceRelativeThresholdFeature("test:srt", {
                    featureToPlace: "test:live_ore",
                    minimumDistanceBelowSurface: 4,
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(
                new SurfaceRelativeThresholdFeature("test:srt_min", {
                    featureToPlace: "test:string_feature",
                }),
            );
        });
    });

    describe("underwater_cave_carver", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new UnderwaterCaveCarverFeature("test:uw_carver", {
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

        test("minimal", (t) => {
            t.assert.snapshot(new UnderwaterCaveCarverFeature("test:uw_carver_min"));
        });
    });

    describe("vegetation_patch", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new VegetationPatchFeature("test:veg", {
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

        test("numbers", (t) => {
            t.assert.snapshot(
                new VegetationPatchFeature("test:veg_num", {
                    replaceableBlocks: [],
                    groundBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    vegetationFeature: "test:string_feature",
                    depth: 1,
                    verticalRange: 3,
                    horizontalRadius: 2,
                }),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(
                new VegetationPatchFeature("test:veg_min", {
                    vegetationFeature: "test:string_feature",
                }),
            );
        });
    });

    describe("weighted_random", () => {
        test("full", (t) => {
            t.assert.snapshot(
                new WeightedRandomFeature("test:weighted", {
                    features: [["test:live_ore", 3]],
                })
                    .add("test:string_feature", 1)
                    .add(new SequenceFeature("test:live_sequence", { features: [] }), 0.5),
            );
        });

        test("minimal", (t) => {
            t.assert.snapshot(new WeightedRandomFeature("test:weighted_min"));
        });
    });
});

describe("FeatureRules", () => {
    test("full instance", (t) => {
        t.assert.snapshot(
            new FeatureRules("test:rules", {
                placesFeature: "test:live_ore",
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

    test("string feature", (t) => {
        t.assert.snapshot(
            new FeatureRules("test:rules_str", {
                placesFeature: "test:string_feature",
                placementPass: "surface_pass",
                biomeFilter: new BiomeFilter().hasTag("forest"),
                coordinateEvalOrder: "xzy",
            }),
        );
    });

    test("empty biome filter", (t) => {
        t.assert.snapshot(
            new FeatureRules("test:rules_empty_filter", {
                placesFeature: "test:string_feature",
                biomeFilter: new BiomeFilter(),
            }),
        );
    });

    test("minimal", (t) => {
        t.assert.snapshot(
            new FeatureRules("test:rules_min", { placesFeature: "test:string_feature" }),
        );
    });
});

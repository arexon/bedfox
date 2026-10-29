import { describe, expect, test } from "vite-plus/test";

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
    test("single", () => {
        expect(new BiomeFilter().hasTag("forest")).toMatchSnapshot();
    });

    test("multiple", () => {
        expect(
            new BiomeFilter()
                .hasTag("overworld")
                .isBiome("minecraft:plains")
                .isSnowCovered()
                .isHumid(false)
                .isTemperatureType("cold")
                .isTemperatureValue("0.5"),
        ).toMatchSnapshot();
    });

    test("all of any of", () => {
        expect(
            new BiomeFilter()
                .allOf((b) => b.hasTag("overworld").isSnowCovered(false))
                .anyOf((b) => b.hasTag("forest").hasTag("taiga")),
        ).toMatchSnapshot();
    });

    describe("not", () => {
        test("negates a test", () => {
            expect(new BiomeFilter().not.hasTag("ocean")).toMatchSnapshot();
        });

        test("only negates the next test", () => {
            expect(new BiomeFilter().not.hasTag("ocean").hasTag("forest")).toMatchSnapshot();
        });

        test("is only followed by a test", () => {
            const filter = new BiomeFilter();
            // @ts-expect-error groups can't be negated
            expect(() => filter.not.allOf(() => {})).toThrow(TypeError);
            // @ts-expect-error double negation
            expect(filter.not.not).toBe(undefined);
        });
    });

    test("empty", () => {
        expect(new BiomeFilter()).toMatchSnapshot();
    });

    describe("direct", () => {
        test("single", () => {
            expect(new BiomeFilterSingle("is_biome", "!=", "minecraft:desert")).toMatchSnapshot();
        });

        test("multi", () => {
            expect(
                new BiomeFilterMulti({
                    anyOf: [new BiomeFilterSingle("has_biome_tag", "==", "hills")],
                    allOf: [new BiomeFilterSingle("is_humid", "!=", "true")],
                }),
            ).toMatchSnapshot();
        });
    });
});

describe("features", () => {
    describe("aggregate", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("cave_carver", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("conditional_list", () => {
        test("full", () => {
            expect(
                new ConditionalListFeature("conditional", {
                    features: [{ placesFeature: "test:live_ore", condition: "q.is_snow_covered" }],
                    earlyOut: "placement_success",
                })
                    .add("test:string_feature")
                    .add(new SequenceFeature("live_sequence", { features: [] }), "v.x > 0"),
            ).toMatchSnapshot();
        });
    });

    describe("fossil", () => {
        test("full", () => {
            expect(
                new FossilFeature("fossil", {
                    oreBlock: "minecraft:coal_ore",
                    maxEmptyCorners: 4,
                }),
            ).toMatchSnapshot();
        });
    });

    describe("geode", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("growing_plant", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("height_difference_filter", () => {
        test("full", () => {
            expect(
                new HeightDifferenceFilterFeature("hdf", {
                    placesFeature: "test:live_ore",
                    searchRadius: 3,
                    minRequiredUpwardHeightDiff: 1,
                    minRequiredDownwardHeightDiff: 2,
                    maxAllowedUpwardHeightDiff: 5,
                    maxAllowedDownwardHeightDiff: 6,
                }),
            ).toMatchSnapshot();
        });
    });

    describe("horizontal_tree_decoration", () => {
        test("full", () => {
            expect(
                new HorizontalTreeDecorationFeature("htd", {
                    placesBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    allowAdjacent: true,
                    barkSideOnly: false,
                }),
            ).toMatchSnapshot();
        });
    });

    describe("multi_block", () => {
        test("full", () => {
            expect(
                new MultiBlockFeature("multi_block", {
                    placesBlock: "minecraft:tall_grass",
                    enforcePlacementRules: true,
                    randomizeRotation: false,
                    mayReplace: [
                        "minecraft:air",
                        { name: "minecraft:stone", states: { stone_type: "granite" } },
                    ],
                }),
            ).toMatchSnapshot();
        });
    });

    describe("multiface", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("multipart_block_column", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("nether_cave_carver", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("ore", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("partially_exposed_blob", () => {
        test("full", () => {
            expect(
                new PartiallyExposedBlobFeature("blob", {
                    placesBlock: { name: "minecraft:stone", states: { stone_type: "granite" } },
                    placementRadiusAroundFloor: 2,
                    placementProbabilityPerValidPosition: 0.5,
                    exposedFace: "up",
                }),
            ).toMatchSnapshot();
        });
    });

    describe("scatter", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("search", () => {
        test("full", () => {
            expect(
                new SearchFeature("search", {
                    placesFeature: "test:live_ore",
                    searchVolume: { min: new Vec3(-3, -3, -3), max: new Vec3(3, 3, 3) },
                    searchAxis: "-y",
                    requiredSuccesses: 2,
                }),
            ).toMatchSnapshot();
        });
    });

    describe("sequence", () => {
        test("full", () => {
            expect(
                new SequenceFeature("sequence", {
                    features: [
                        "test:live_ore",
                        "test:string_feature",
                        new AggregateFeature("live_aggregate", { features: [] }),
                    ],
                }),
            ).toMatchSnapshot();
        });
    });

    describe("single_block", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });

        test("weighted", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("snap_to_surface", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("structure_template", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });

        test("boolean constraints", () => {
            expect(
                new StructureTemplateFeature("structure_bool", {
                    structureName: "mystructure:hut",
                    grounded: false,
                    unburied: true,
                    leveled: true,
                    blockIntersection: true,
                }),
            ).toMatchSnapshot();
        });

        test("empty constraint objects", () => {
            expect(
                new StructureTemplateFeature("structure_empty", {
                    structureName: "mystructure:tower",
                    leveled: {},
                    blockIntersection: {},
                }),
            ).toMatchSnapshot();
        });
    });

    describe("surface_relative_threshold", () => {
        test("full", () => {
            expect(
                new SurfaceRelativeThresholdFeature("srt", {
                    featureToPlace: "test:live_ore",
                    minimumDistanceBelowSurface: 4,
                }),
            ).toMatchSnapshot();
        });
    });

    describe("underwater_cave_carver", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("vegetation_patch", () => {
        test("full", () => {
            expect(
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
            ).toMatchSnapshot();
        });
    });

    describe("weighted_random", () => {
        test("full", () => {
            expect(
                new WeightedRandomFeature("weighted", {
                    features: [["test:live_ore", 3]],
                })
                    .add("test:string_feature", 1)
                    .add(new SequenceFeature("live_sequence", { features: [] }), 0.5),
            ).toMatchSnapshot();
        });
    });
});

describe(FeatureRules.name, () => {
    test("full instance", () => {
        expect(
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
        ).toMatchSnapshot();
    });

    test("empty biome filter", () => {
        expect(
            new FeatureRules("rules_empty_filter", {
                placesFeature: "test:string_feature",
                biomeFilter: new BiomeFilter(),
            }),
        ).toMatchSnapshot();
    });
});

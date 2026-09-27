import type {
    AggregateFeature,
    CaveCarverFeature,
    ConditionalListFeature,
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
} from "@bedfox/api/feature";

export * from "./aggregate.ts";
export * from "./biome_filter.ts";
export * from "./cave_carver.ts";
export * from "./conditional_list.ts";
export * from "./fossil.ts";
export * from "./geode.ts";
export * from "./growing_plant.ts";
export * from "./height_difference_filter.ts";
export * from "./horizontal_tree_decoration.ts";
export * from "./multi_block.ts";
export * from "./multiface.ts";
export * from "./multipart_block_column.ts";
export * from "./nether_cave_carver.ts";
export * from "./ore.ts";
export * from "./partially_exposed_blob.ts";
export * from "./rules.ts";
export * from "./scatter.ts";
export * from "./search.ts";
export * from "./sequence.ts";
export * from "./single_block.ts";
export * from "./snap_to_surface.ts";
export * from "./structure_template.ts";
export * from "./surface_relative_threshold.ts";
export * from "./underwater_cave_carver.ts";
export * from "./vegetation_patch.ts";
export * from "./weighted_random.ts";

export type FeatureReference = string | Feature;

export type Feature =
    | ScatterFeature
    | AggregateFeature
    | SequenceFeature
    | WeightedRandomFeature
    | ConditionalListFeature
    | SearchFeature
    | SnapToSurfaceFeature
    | HeightDifferenceFilterFeature
    | SurfaceRelativeThresholdFeature
    | SingleBlockFeature
    | MultiBlockFeature
    | HorizontalTreeDecorationFeature
    | MultifaceFeature
    | OreFeature
    | FossilFeature
    | CaveCarverFeature
    | NetherCaveCarverFeature
    | UnderwaterCaveCarverFeature
    | PartiallyExposedBlobFeature
    | GrowingPlantFeature
    | VegetationPatchFeature
    | GeodeFeature
    | StructureTemplateFeature
    | MultipartBlockColumnFeature;

import type { DefinitionProps, Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class SurfaceRelativeThresholdFeature extends Feature.of(
    "minecraft:surface_relative_threshold_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    featureToPlace!: FeatureReference;

    minimumDistanceBelowSurface?: number;

    constructor(identifier: string, props?: DefinitionProps<SurfaceRelativeThresholdFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Feature, this.featureToPlace);
    }
}

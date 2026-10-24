import type { DefinitionProps, Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class HeightDifferenceFilterFeature extends Feature.of(
    "minecraft:height_difference_filter_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    placesFeature!: FeatureReference;

    searchRadius!: number;

    minRequiredUpwardHeightDiff?: number;

    minRequiredDownwardHeightDiff?: number;

    maxAllowedUpwardHeightDiff?: number;

    maxAllowedDownwardHeightDiff?: number;

    constructor(identifier: string, props?: DefinitionProps<HeightDifferenceFilterFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Feature, this.placesFeature);
    }
}

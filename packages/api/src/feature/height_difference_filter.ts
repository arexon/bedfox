import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

const ROOT = "minecraft:height_difference_filter_feature";

@serialize
export class HeightDifferenceFilterFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    placesFeature!: FeatureReference;

    @serialize({ within: ROOT })
    searchRadius!: number;

    @serialize({ within: ROOT })
    minRequiredUpwardHeightDiff?: number;

    @serialize({ within: ROOT })
    minRequiredDownwardHeightDiff?: number;

    @serialize({ within: ROOT })
    maxAllowedUpwardHeightDiff?: number;

    @serialize({ within: ROOT })
    maxAllowedDownwardHeightDiff?: number;

    constructor(identifier: string, props?: DefinitionProps<HeightDifferenceFilterFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Feature, this.placesFeature);
    }
}

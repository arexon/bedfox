import { type Reference, serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { targets } from "#/references";

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

    override placements(): Reference[] {
        return targets(Feature, this.placesFeature);
    }
}

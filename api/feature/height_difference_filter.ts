import type { DefinitionProps, ReferenceTarget } from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import { FormatVersion } from "@bedfox/api/version";
import { Feature } from "./base.ts";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier, targets } from "../_utils.ts";

const PATH = "minecraft:height_difference_filter_feature";

@Ser()
export class HeightDifferenceFilterFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH, custom: autoIdentifier })
    placesFeature!: FeatureReference;

    @Ser({ path: PATH })
    searchRadius!: number;

    @Ser({ path: PATH })
    minRequiredUpwardHeightDiff?: number;

    @Ser({ path: PATH })
    minRequiredDownwardHeightDiff?: number;

    @Ser({ path: PATH })
    maxAllowedUpwardHeightDiff?: number;

    @Ser({ path: PATH })
    maxAllowedDownwardHeightDiff?: number;

    constructor(
        identifier: string,
        props?: DefinitionProps<HeightDifferenceFilterFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(
            this.placesFeature,
        );
    }
}

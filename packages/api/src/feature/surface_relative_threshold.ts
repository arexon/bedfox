import { Ser } from "@bedfox/serialize";

import { autoIdentifier, targets } from "#/_utils";
import type { DefinitionProps, ReferenceTarget } from "#/common/index";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/index";
import { FormatVersion } from "#/version";

const PATH = "minecraft:surface_relative_threshold_feature";

@Ser()
export class SurfaceRelativeThresholdFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH, custom: autoIdentifier })
    featureToPlace!: FeatureReference;

    @Ser({ path: PATH })
    minimumDistanceBelowSurface?: number;

    constructor(identifier: string, props?: DefinitionProps<SurfaceRelativeThresholdFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.featureToPlace);
    }
}

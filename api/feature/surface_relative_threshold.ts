import { Definition, type DefinitionProps } from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier } from "../_utils.ts";

const PATH = "minecraft:surface_relative_threshold_feature";

@Ser()
export class SurfaceRelativeThresholdFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH, custom: autoIdentifier })
    featureToPlace!: FeatureReference;

    @Ser({ path: PATH })
    minimumDistanceBelowSurface?: number;

    constructor(
        identifier: string,
        props?: DefinitionProps<SurfaceRelativeThresholdFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _resolveInstances(): Definition[] {
        return typeof this.featureToPlace === "string"
            ? []
            : [this.featureToPlace];
    }
}

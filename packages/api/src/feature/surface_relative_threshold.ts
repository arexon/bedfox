import type { BRAND } from "#/core/brand";
import type { DefinitionProps } from "#/core/definition";
import type { Reference } from "#/core/entry";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

const ROOT = "minecraft:surface_relative_threshold_feature";

@serialize
export class SurfaceRelativeThresholdFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    featureToPlace!: FeatureReference;

    @serialize({ within: ROOT })
    minimumDistanceBelowSurface?: number;

    constructor(identifier: string, props?: DefinitionProps<SurfaceRelativeThresholdFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override placements(): Reference[] {
        return targets(Feature, this.featureToPlace);
    }
}

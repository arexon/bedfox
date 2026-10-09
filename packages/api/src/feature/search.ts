import { Ser } from "@bedfox/serialize";

import { autoIdentifier, targets } from "#/_utils";
import { type DefinitionProps, type ReferenceTarget, Vec3 } from "#/common/index";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/index";
import { FormatVersion } from "#/version";

export enum SearchAxis {
    NegX = "-x",
    PosX = "+x",
    NegY = "-y",
    PosY = "+y",
    NegZ = "-z",
    PosZ = "+z",
}

@Ser()
export class SearchVolume {
    @Ser({ custom: Vec3.CUSTOM_SER.TUPLE })
    min: Vec3;

    @Ser({ custom: Vec3.CUSTOM_SER.TUPLE })
    max: Vec3;

    constructor(min: Vec3, max: Vec3) {
        this.min = min;
        this.max = max;
    }
}

const PATH = "minecraft:search_feature";

@Ser()
export class SearchFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH, custom: autoIdentifier })
    placesFeature!: FeatureReference;

    @Ser({ path: PATH })
    searchVolume!: SearchVolume;

    @Ser({ path: PATH })
    searchAxis!: SearchAxis;

    @Ser({ path: PATH })
    requiredSuccesses?: number;

    constructor(identifier: string, props?: DefinitionProps<SearchFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.placesFeature);
    }
}

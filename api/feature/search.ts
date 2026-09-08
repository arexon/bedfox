import { Definition, type DefinitionProps, Vec3 } from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier } from "../_utils.ts";

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
export class SearchFeature extends Definition {
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

    override _resolveInstances(): Definition[] {
        return typeof this.placesFeature === "string"
            ? []
            : [this.placesFeature];
    }
}

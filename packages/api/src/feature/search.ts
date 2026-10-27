import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { Vec3 } from "#/primitive/vec3";
import { serialize } from "#/serialize";

export type SearchAxis = "-x" | "+x" | "-y" | "+y" | "-z" | "+z";

export interface SearchVolume {
    min: Vec3;
    max: Vec3;
}

const ROOT = "minecraft:search_feature";

@serialize
export class SearchFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    placesFeature!: FeatureReference;

    @serialize({ within: ROOT })
    searchVolume!: SearchVolume;

    @serialize({ within: ROOT })
    searchAxis!: SearchAxis;

    @serialize({ within: ROOT })
    requiredSuccesses?: number;

    constructor(identifier: string, props?: DefinitionProps<SearchFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Feature, this.placesFeature);
    }
}

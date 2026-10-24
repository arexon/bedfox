import type { DefinitionProps, Reference } from "#/core/definition";
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

@serialize
export class SearchFeature extends Feature.of(
    "minecraft:search_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    placesFeature!: FeatureReference;

    searchVolume!: SearchVolume;

    searchAxis!: SearchAxis;

    requiredSuccesses?: number;

    constructor(identifier: string, props?: DefinitionProps<SearchFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Feature, this.placesFeature);
    }
}

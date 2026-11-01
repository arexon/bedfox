import { type Reference, serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { targets } from "#/references";

const ROOT = "minecraft:weighted_random_feature";

@serialize
export class WeightedRandomFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    features: [FeatureReference, number][] = [];

    constructor(identifier: string, props?: DefinitionProps<WeightedRandomFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    add(feature: FeatureReference, weight: number): this {
        this.features.push([feature, weight]);
        return this;
    }

    override placements(): Reference[] {
        return targets(
            Feature,
            this.features.map(([feature]) => feature),
        );
    }
}

import type { DefinitionProps, Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class WeightedRandomFeature extends Feature.of(
    "minecraft:weighted_random_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    features: [FeatureReference, number][] = [];

    constructor(identifier: string, props?: DefinitionProps<WeightedRandomFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    add(feature: FeatureReference, weight: number): this {
        this.features.push([feature, weight]);
        return this;
    }

    override _placements(): Reference[] {
        return targets(
            Feature,
            this.features.map(([feature]) => feature),
        );
    }
}

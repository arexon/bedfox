import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

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

    override _placements(): Reference[] {
        return targets(
            Feature,
            this.features.map(([feature]) => feature),
        );
    }
}

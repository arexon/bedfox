import { Ser } from "@bedfox/serialize";

import { autoIdentifier, targets } from "#/_utils";
import type { DefinitionProps, ReferenceTarget } from "#/common/index";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/index";
import { FormatVersion } from "#/version";

const PATH = "minecraft:weighted_random_feature";

@Ser()
export class WeightedRandomFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({
        path: PATH,
        custom: (v) => v.map(([f, w]) => [autoIdentifier(f), w]),
    })
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

    override _placements(): ReferenceTarget[] {
        return targets(this.features.map(([feature]) => feature));
    }
}

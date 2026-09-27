import {
    Definition,
    type DefinitionProps,
    type Reference,
    Relation,
} from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier, refs } from "../_utils.ts";

const PATH = "minecraft:weighted_random_feature";

@Ser()
export class WeightedRandomFeature extends Definition {
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

    constructor(
        identifier: string,
        props?: DefinitionProps<WeightedRandomFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    add(feature: FeatureReference, weight: number): this {
        this.features.push([feature, weight]);
        return this;
    }

    override _references(): Reference[] {
        return [
            ...refs(Relation.Places, this.features.map(([feature]) => feature)),
        ];
    }
}

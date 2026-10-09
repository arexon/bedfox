import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { serialize } from "#/core/serialize";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion, type Molang } from "#/primitive/index";

export type ConditionalEarlyOut = "condition_success" | "placement_success" | "none";

export interface ConditionalFeatureEntry {
    placesFeature: FeatureReference;
    condition?: Molang;
}

@serialize
export class ConditionalListFeature extends Feature.of(
    "minecraft:conditional_list",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    @serialize({ rename: "conditional_features" })
    features: ConditionalFeatureEntry[] = [];

    @serialize({ rename: "early_out_scheme" })
    earlyOut?: ConditionalEarlyOut;

    constructor(identifier: string, props?: DefinitionProps<ConditionalListFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    add(feature: FeatureReference, condition?: Molang): this {
        this.features.push({ placesFeature: feature, condition });
        return this;
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.features.map((entry) => entry.placesFeature));
    }
}

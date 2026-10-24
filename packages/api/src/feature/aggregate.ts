import type { DefinitionProps, Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

export type FeatureEarlyOut = "none" | "first_success" | "first_failure";

@serialize
export class AggregateFeature extends Feature.of(
    "minecraft:aggregate_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    features!: FeatureReference[];

    earlyOut?: FeatureEarlyOut;

    constructor(identifier: string, props?: DefinitionProps<AggregateFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Feature, this.features);
    }
}

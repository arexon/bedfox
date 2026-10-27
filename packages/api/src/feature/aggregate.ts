import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

export type FeatureEarlyOut = "none" | "first_success" | "first_failure";

const ROOT = "minecraft:aggregate_feature";

@serialize
export class AggregateFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    features!: FeatureReference[];

    @serialize({ within: ROOT })
    earlyOut?: FeatureEarlyOut;

    constructor(identifier: string, props?: DefinitionProps<AggregateFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Feature, this.features);
    }
}

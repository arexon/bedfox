import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion, type Molang } from "#/primitive/index";
import { serialize } from "#/serialize";

export type ConditionalEarlyOut = "condition_success" | "placement_success" | "none";

export interface ConditionalFeatureEntry {
    placesFeature: FeatureReference;
    condition?: Molang;
}

const ROOT = "minecraft:conditional_list";

@serialize
export class ConditionalListFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT, rename: "conditional_features" })
    features: ConditionalFeatureEntry[] = [];

    @serialize({ within: ROOT, rename: "early_out_scheme" })
    earlyOut?: ConditionalEarlyOut;

    constructor(identifier: string, props?: DefinitionProps<ConditionalListFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    add(feature: FeatureReference, condition?: Molang): this {
        this.features.push({ placesFeature: feature, condition });
        return this;
    }

    override _placements(): Reference[] {
        return targets(
            Feature,
            this.features.map((entry) => entry.placesFeature),
        );
    }
}

import { Definition, type DefinitionProps } from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import type { Molang } from "@bedfox/api/molang";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier } from "../_utils.ts";

export enum ConditionalEarlyOut {
    ConditionSuccess = "condition_success",
    PlacementSuccess = "placement_success",
    None = "none",
}

@Ser()
export class ConditionalFeatureEntry {
    @Ser({ custom: autoIdentifier })
    placesFeature: FeatureReference;

    @Ser()
    condition?: Molang;

    constructor(placesFeature: FeatureReference, condition?: Molang) {
        this.placesFeature = placesFeature;
        this.condition = condition;
    }
}

const PATH = "minecraft:conditional_list";

@Ser()
export class ConditionalListFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH, rename: "conditionalFeatures", default: () => [] })
    features: ConditionalFeatureEntry[] = [];

    @Ser({
        path: PATH,
        rename: "earlyOutScheme",
        default: () => ConditionalEarlyOut.None,
    })
    earlyOut?: ConditionalEarlyOut;

    constructor(
        identifier: string,
        props?: DefinitionProps<ConditionalListFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    add(feature: FeatureReference, condition?: Molang): this {
        this.features.push(new ConditionalFeatureEntry(feature, condition));
        return this;
    }

    override _resolveInstances(): Definition[] {
        return this.features.flatMap((v) =>
            typeof v.placesFeature === "string" ? [] : [v.placesFeature]
        );
    }
}

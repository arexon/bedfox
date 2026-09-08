import { Definition, type DefinitionProps } from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier } from "../_utils.ts";

export enum FeatureEarlyOut {
    None = "none",
    FirstSuccess = "first_success",
    FirstFailure = "first_failure",
}

const PATH = "minecraft:aggregate_feature";

@Ser()
export class AggregateFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH, custom: (v) => v.map(autoIdentifier) })
    features!: FeatureReference[];

    @Ser({ path: PATH, default: () => FeatureEarlyOut.None })
    earlyOut?: FeatureEarlyOut;

    constructor(identifier: string, props?: DefinitionProps<AggregateFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _resolveInstances(): Definition[] {
        return this.features.filter((v) => typeof v !== "string");
    }
}

import { Ser } from "@bedfox/serialize";

import { autoIdentifier, targets } from "#/_utils";
import type { DefinitionProps, ReferenceTarget } from "#/common/index";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/index";
import { FormatVersion } from "#/version";

const PATH = "minecraft:sequence_feature";

@Ser()
export class SequenceFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH, custom: (v) => v.map(autoIdentifier) })
    features!: FeatureReference[];

    constructor(identifier: string, props?: DefinitionProps<SequenceFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.features);
    }
}

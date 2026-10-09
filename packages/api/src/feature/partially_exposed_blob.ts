import { Ser } from "@bedfox/serialize";

import { targets } from "#/_utils";
import type {
    BlockDescriptorRef,
    DefinitionProps,
    Direction,
    ReferenceTarget,
} from "#/common/index";
import { Feature } from "#/feature/base";
import { FormatVersion } from "#/version";

const PATH = "minecraft:partially_exposed_blob_feature";

@Ser()
export class PartiallyExposedBlobFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    placesBlock!: BlockDescriptorRef;

    @Ser({ path: PATH })
    placementRadiusAroundFloor!: number;

    @Ser({ path: PATH })
    placementProbabilityPerValidPosition!: number;

    @Ser({ path: PATH })
    exposedFace?: Direction;

    constructor(identifier: string, props?: DefinitionProps<PartiallyExposedBlobFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.placesBlock);
    }
}

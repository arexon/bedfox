import { Ser } from "@bedfox/serialize";

import { targets } from "#/_utils";
import type { BlockDescriptorRef, DefinitionProps, ReferenceTarget } from "#/common/index";
import { Feature } from "#/feature/base";
import { FormatVersion } from "#/version";

const PATH = "minecraft:fossil_feature";

@Ser()
export class FossilFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    oreBlock!: BlockDescriptorRef;

    @Ser({ path: PATH })
    maxEmptyCorners!: number;

    constructor(identifier: string, props?: DefinitionProps<FossilFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.oreBlock);
    }
}

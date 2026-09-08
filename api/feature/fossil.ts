import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";

const PATH = "minecraft:fossil_feature";

@Ser()
export class FossilFeature extends Definition {
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

    override _resolveInstances(): Definition[] {
        return [];
    }
}

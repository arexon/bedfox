import { Ser } from "@bedfox/serialize";

import { targets } from "#/_utils";
import type { BlockDescriptorRef, DefinitionProps, ReferenceTarget } from "#/common/index";
import { Feature } from "#/feature/base";
import { FormatVersion } from "#/version";

const PATH = "minecraft:multi_block_feature";

@Ser()
export class MultiBlockFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    placesBlock!: BlockDescriptorRef;

    @Ser({ path: PATH })
    enforcePlacementRules?: boolean;

    @Ser({ path: PATH })
    randomizeRotation?: boolean;

    @Ser({ path: PATH })
    mayReplace?: BlockDescriptorRef[];

    constructor(identifier: string, props?: DefinitionProps<MultiBlockFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.placesBlock);
    }

    override _references(): ReferenceTarget[] {
        return targets(this._placements(), this.mayReplace);
    }
}

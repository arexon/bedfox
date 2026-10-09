import { Ser } from "@bedfox/serialize";

import { targets } from "#/_utils";
import {
    type BlockDescriptorRef,
    type DefinitionProps,
    Range,
    type ReferenceTarget,
    type VerticalDirection,
} from "#/common/index";
import { Feature } from "#/feature/base";
import { FormatVersion } from "#/version";

const PATH = "minecraft:multipart_block_column_feature";

@Ser()
export class MultipartBlockColumnFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    tipBlock!: BlockDescriptorRef;

    @Ser({ path: PATH })
    frustumBlock!: BlockDescriptorRef;

    @Ser({ path: PATH })
    middleBlock!: BlockDescriptorRef;

    @Ser({ path: PATH })
    baseBlock!: BlockDescriptorRef;

    @Ser({ path: PATH, custom: Range.CUSTOM_SER.NUMBER_OR_TUPLE })
    heightRange?: number | Range;

    @Ser({ path: PATH })
    weightedHeights?: number[];

    @Ser({ path: PATH })
    direction?: VerticalDirection;

    @Ser({ path: PATH })
    mayPlaceOn?: BlockDescriptorRef[];

    @Ser({ path: PATH })
    mayReplace?: BlockDescriptorRef[];

    constructor(identifier: string, props?: DefinitionProps<MultipartBlockColumnFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.tipBlock, this.frustumBlock, this.middleBlock, this.baseBlock);
    }

    override _references(): ReferenceTarget[] {
        return targets(this._placements(), this.mayPlaceOn, this.mayReplace);
    }
}

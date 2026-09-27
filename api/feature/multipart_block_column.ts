import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
    Range,
    type Reference,
    Relation,
    type VerticalDirection,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { refs } from "../_utils.ts";

const PATH = "minecraft:multipart_block_column_feature";

@Ser()
export class MultipartBlockColumnFeature extends Definition {
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

    constructor(
        identifier: string,
        props?: DefinitionProps<MultipartBlockColumnFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _references(): Reference[] {
        return [
            ...refs(
                Relation.Places,
                this.tipBlock,
                this.frustumBlock,
                this.middleBlock,
                this.baseBlock,
            ),
            ...refs(Relation.Requires, this.mayPlaceOn, this.mayReplace),
        ];
    }
}

import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { serialize } from "#/core/serialize";
import { Feature } from "#/feature/base";
import {
    type BlockDescriptorRef,
    FormatVersion,
    Range,
    type VerticalDirection,
} from "#/primitive/index";

@serialize
export class MultipartBlockColumnFeature extends Feature.of(
    "minecraft:multipart_block_column_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    tipBlock!: BlockDescriptorRef;

    frustumBlock!: BlockDescriptorRef;

    middleBlock!: BlockDescriptorRef;

    baseBlock!: BlockDescriptorRef;

    heightRange?: number | Range;

    weightedHeights?: number[];

    direction?: VerticalDirection;

    mayPlaceOn?: BlockDescriptorRef[];

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

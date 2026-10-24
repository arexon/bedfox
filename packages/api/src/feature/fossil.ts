import { Block } from "#/block/index";
import type { DefinitionProps, Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class FossilFeature extends Feature.of(
    "minecraft:fossil_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    oreBlock!: BlockDescriptorRef;

    maxEmptyCorners!: number;

    constructor(identifier: string, props?: DefinitionProps<FossilFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Block, this.oreBlock);
    }
}

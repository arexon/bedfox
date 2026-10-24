import { Block } from "#/block/index";
import type { DefinitionProps, Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class MultiBlockFeature extends Feature.of(
    "minecraft:multi_block_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    placesBlock!: BlockDescriptorRef;

    enforcePlacementRules?: boolean;

    randomizeRotation?: boolean;

    mayReplace?: BlockDescriptorRef[];

    constructor(identifier: string, props?: DefinitionProps<MultiBlockFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Block, this.placesBlock);
    }

    override _references(): Reference[] {
        return [...this._placements(), ...targets(Block, this.mayReplace)];
    }
}

import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { serialize } from "#/core/serialize";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";

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

    override _placements(): ReferenceTarget[] {
        return targets(this.placesBlock);
    }

    override _references(): ReferenceTarget[] {
        return targets(this._placements(), this.mayReplace);
    }
}

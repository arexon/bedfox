import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class HorizontalTreeDecorationFeature extends Feature.of(
    "minecraft:horizontal_tree_decoration_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    placesBlock!: BlockDescriptorRef;

    allowAdjacent?: boolean;

    barkSideOnly?: boolean;

    constructor(identifier: string, props?: DefinitionProps<HorizontalTreeDecorationFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.placesBlock);
    }
}

import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";

const PATH = "minecraft:horizontal_tree_decoration_feature";

@Ser()
export class HorizontalTreeDecorationFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    placesBlock!: BlockDescriptorRef;

    @Ser({ path: PATH })
    allowAdjacent?: boolean;

    @Ser({ path: PATH })
    barkSideOnly?: boolean;

    constructor(
        identifier: string,
        props?: DefinitionProps<HorizontalTreeDecorationFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _resolveInstances(): Definition[] {
        return [];
    }
}

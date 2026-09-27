import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
    type Reference,
    Relation,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { refs } from "../_utils.ts";

const PATH = "minecraft:multi_block_feature";

@Ser()
export class MultiBlockFeature extends Definition {
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

    constructor(
        identifier: string,
        props?: DefinitionProps<MultiBlockFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _references(): Reference[] {
        return [
            ...refs(Relation.Places, this.placesBlock),
            ...refs(Relation.Requires, this.mayReplace),
        ];
    }
}

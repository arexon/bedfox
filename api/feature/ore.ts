import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";

@Ser()
export class OreReplaceRule {
    @Ser()
    placesBlock: BlockDescriptorRef;

    @Ser()
    mayReplace?: BlockDescriptorRef[];

    constructor(
        placesBlock: BlockDescriptorRef,
        mayReplace?: BlockDescriptorRef[],
    ) {
        this.placesBlock = placesBlock;
        this.mayReplace = mayReplace;
    }
}

const PATH = "minecraft:ore_feature";

@Ser()
export class OreFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    count!: number;

    @Ser({ path: PATH })
    discardChanceOnAirExposure?: number;

    @Ser({ path: PATH, default: () => [] })
    replaceRules: OreReplaceRule[] = [];

    constructor(identifier: string, props?: DefinitionProps<OreFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    add(
        placesBlock: BlockDescriptorRef,
        mayReplace?: BlockDescriptorRef[],
    ): this {
        this.replaceRules.push(new OreReplaceRule(placesBlock, mayReplace));
        return this;
    }

    override _resolveInstances(): Definition[] {
        return [];
    }
}

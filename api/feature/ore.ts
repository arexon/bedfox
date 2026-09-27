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

    override _references(): Reference[] {
        return [
            ...refs(
                Relation.Places,
                this.replaceRules.map((rule) => rule.placesBlock),
            ),
            ...refs(
                Relation.Requires,
                this.replaceRules.flatMap((rule) => rule.mayReplace ?? []),
            ),
        ];
    }
}

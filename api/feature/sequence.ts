import {
    Definition,
    type DefinitionProps,
    type Reference,
    Relation,
} from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier, refs } from "../_utils.ts";

const PATH = "minecraft:sequence_feature";

@Ser()
export class SequenceFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH, custom: (v) => v.map(autoIdentifier) })
    features!: FeatureReference[];

    constructor(identifier: string, props?: DefinitionProps<SequenceFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _references(): Reference[] {
        return [
            ...refs(Relation.Places, this.features),
        ];
    }
}

import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { serialize } from "#/core/serialize";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion } from "#/primitive/index";

@serialize
export class SequenceFeature extends Feature.of(
    "minecraft:sequence_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    features!: FeatureReference[];

    constructor(identifier: string, props?: DefinitionProps<SequenceFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.features);
    }
}

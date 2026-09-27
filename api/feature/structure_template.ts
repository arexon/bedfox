import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
    type FacingDirection,
    type Reference,
    Relation,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { refs } from "../_utils.ts";

@Ser()
export class LeveledConstraint {
    @Ser()
    maxSteepness?: number;

    constructor(maxSteepness?: number) {
        this.maxSteepness = maxSteepness;
    }
}

@Ser()
export class BlockIntersectionConstraint {
    @Ser()
    onlyCheckIntersectionForMotionBlockingBlocks?: boolean;

    @Ser()
    blockAllowlist?: BlockDescriptorRef[];

    constructor(props: BlockIntersectionConstraint) {
        Object.assign(this, props);
    }
}

const PATH = "minecraft:structure_template_feature";

@Ser()
export class StructureTemplateFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    structureName!: string;

    @Ser({ path: `${PATH}/constraints`, custom: maybeConstraint })
    grounded?: boolean;

    @Ser({ path: `${PATH}/constraints`, custom: maybeConstraint })
    unburied?: boolean;

    @Ser({ path: `${PATH}/constraints`, custom: maybeConstraint })
    leveled?: boolean | LeveledConstraint;

    @Ser({ path: `${PATH}/constraints`, custom: maybeConstraint })
    blockIntersection?: boolean | BlockIntersectionConstraint;

    @Ser({ path: PATH })
    adjustmentRadius?: number;

    @Ser({ path: PATH })
    facingDirection?: FacingDirection;

    @Ser({ path: PATH })
    rotateAroundCenter?: boolean;

    @Ser({ path: PATH })
    groundLevel?: number;

    constructor(
        identifier: string,
        props?: DefinitionProps<StructureTemplateFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _references(): Reference[] {
        return [
            ...refs(
                Relation.Requires,
                typeof this.blockIntersection === "object"
                    ? this.blockIntersection.blockAllowlist
                    : undefined,
            ),
        ];
    }
}

function maybeConstraint<T>(value: boolean | T | undefined): T | undefined {
    return value === true ? {} as T : value === false ? undefined : value;
}

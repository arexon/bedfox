import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { serialize } from "#/core/serialize";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, type FacingDirection, FormatVersion } from "#/primitive/index";

export interface LeveledConstraint {
    maxSteepness?: number;
}

export interface BlockIntersectionConstraint {
    onlyCheckIntersectionForMotionBlockingBlocks?: boolean;
    blockAllowlist?: BlockDescriptorRef[];
}

@serialize
export class StructureTemplateFeature extends Feature.of(
    "minecraft:structure_template_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    structureName!: string;

    /** Serialized under `constraints`: `true` emits `{}`, `false` omits it. */
    @serialize({ within: "constraints", override: serConstraint })
    grounded?: boolean;

    /** Serialized under `constraints`: `true` emits `{}`, `false` omits it. */
    @serialize({ within: "constraints", override: serConstraint })
    unburied?: boolean;

    /** Serialized under `constraints`: `true` emits `{}`, `false` omits it. */
    @serialize({ within: "constraints", override: serConstraint })
    leveled?: boolean | LeveledConstraint;

    /** Serialized under `constraints`: `true` emits `{}`, `false` omits it. */
    @serialize({ within: "constraints", override: serConstraint })
    blockIntersection?: boolean | BlockIntersectionConstraint;

    adjustmentRadius?: number;

    facingDirection?: FacingDirection;

    rotateAroundCenter?: boolean;

    groundLevel?: number;

    constructor(identifier: string, props?: DefinitionProps<StructureTemplateFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _references(): ReferenceTarget[] {
        return targets(
            this._placements(),
            typeof this.blockIntersection === "object"
                ? this.blockIntersection.blockAllowlist
                : undefined,
        );
    }
}

function serConstraint(value: unknown): unknown {
    return value === true ? {} : value === false ? undefined : value;
}

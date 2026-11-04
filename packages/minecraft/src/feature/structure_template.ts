import { type Reference, serialize } from "@bedfox/core";

import { Block } from "#/block/index";
import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, type FacingDirection, FormatVersion } from "#/primitive/index";
import { targets } from "#/references";

export interface LeveledConstraint {
    maxSteepness?: number;
}

export interface BlockIntersectionConstraint {
    onlyCheckIntersectionForMotionBlockingBlocks?: boolean;
    blockAllowlist?: BlockDescriptorRef[];
}

const ROOT = "minecraft:structure_template_feature";

@serialize
export class StructureTemplateFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    structureName!: string;

    @serialize({ within: [ROOT, "constraints"], override: serConstraint })
    grounded?: boolean;

    @serialize({ within: [ROOT, "constraints"], override: serConstraint })
    unburied?: boolean;

    @serialize({ within: [ROOT, "constraints"], override: serConstraint })
    leveled?: boolean | LeveledConstraint;

    @serialize({ within: [ROOT, "constraints"], override: serConstraint })
    blockIntersection?: boolean | BlockIntersectionConstraint;

    @serialize({ within: ROOT })
    adjustmentRadius?: number;

    @serialize({ within: ROOT })
    facingDirection?: FacingDirection;

    @serialize({ within: ROOT })
    rotateAroundCenter?: boolean;

    @serialize({ within: ROOT })
    groundLevel?: number;

    constructor(identifier: string, props?: DefinitionProps<StructureTemplateFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override references(): Reference[] {
        return [
            ...this.placements(),
            ...targets(
                Block,
                typeof this.blockIntersection === "object"
                    ? this.blockIntersection.blockAllowlist
                    : undefined,
            ),
        ];
    }
}

function serConstraint(value: unknown): unknown {
    return value === true ? {} : value === false ? undefined : value;
}

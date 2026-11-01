import { serialize } from "@bedfox/core";

import type { TintMethod } from "#/block/component/material_instances";
import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";

@serialize
export class DestructionParticlesBlockComponent extends Component {
    static override readonly componentId = "minecraft:destruction_particles";

    declare readonly [BRAND]: typeof DestructionParticlesBlockComponent.componentId;

    texture?: string;

    /** @default "none" */
    tintMethod?: TintMethod;

    /** @default 100 */
    particleCount?: number;

    constructor(props: ComponentProps<DestructionParticlesBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

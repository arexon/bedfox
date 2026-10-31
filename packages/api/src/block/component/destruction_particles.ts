import type { TintMethod } from "#/block/component/material_instances";
import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

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

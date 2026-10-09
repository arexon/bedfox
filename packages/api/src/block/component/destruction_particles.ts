import type { TintMethod } from "#/block/component/material_instances";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class DestructionParticlesBlockComponent extends Component.of(
    "minecraft:destruction_particles",
) {
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

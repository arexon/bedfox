import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps, TintMethod } from "#/common/index";

@Ser()
export class DestructionParticlesBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:destruction_particles";
    }

    @Ser()
    texture?: string;

    @Ser({ default: () => TintMethod.None })
    tintMethod?: TintMethod;

    @Ser({ default: () => 100 })
    particleCount?: number;

    constructor(props: ComponentProps<DestructionParticlesBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

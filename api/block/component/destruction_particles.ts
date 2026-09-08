import { Component, type ComponentProps, TintMethod } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

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

import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps } from "#/common/index";

@Ser()
export class RedstoneConductivityBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:redstone_conductivity";
    }

    @Ser({ default: () => false })
    redstoneConductor?: boolean;

    @Ser({ default: () => true })
    allowsWireToStepDown?: boolean;

    constructor(props: ComponentProps<RedstoneConductivityBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

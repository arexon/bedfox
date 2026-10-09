import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps } from "#/common/index";

@Ser()
export class RedstoneConsumerBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:redstone_consumer";
    }

    @Ser({ default: () => 0 })
    minPower?: number;

    @Ser({ default: () => false })
    propagatesPower?: boolean;

    constructor(props: ComponentProps<RedstoneConsumerBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

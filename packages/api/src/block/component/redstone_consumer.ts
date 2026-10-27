import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class RedstoneConsumerBlockComponent extends Component {
    static override readonly componentId = "minecraft:redstone_consumer";

    declare readonly [BRAND]: typeof RedstoneConsumerBlockComponent.componentId;

    /** @default 0 */
    minPower?: number;

    /** @default false */
    propagatesPower?: boolean;

    constructor(props: ComponentProps<RedstoneConsumerBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

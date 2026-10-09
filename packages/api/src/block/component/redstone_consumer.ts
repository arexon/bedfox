import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class RedstoneConsumerBlockComponent extends Component.of("minecraft:redstone_consumer") {
    /** @default 0 */
    minPower?: number;

    /** @default false */
    propagatesPower?: boolean;

    constructor(props: ComponentProps<RedstoneConsumerBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

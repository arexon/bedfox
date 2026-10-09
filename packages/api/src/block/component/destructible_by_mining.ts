import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

export interface ItemSpecificSpeed {
    item?: string;

    destroySpeed?: number;
}

@serialize
export class DestructibleByMiningBlockComponent extends Component.of(
    "minecraft:destructible_by_mining",
) {
    @serialize({ transparent: true })
    private enabled?: boolean;

    secondsToDestroy?: number;

    itemSpecificSpeeds?: ItemSpecificSpeed[] = [];

    constructor(enabled: boolean);
    constructor(props: ComponentProps<DestructibleByMiningBlockComponent>);
    constructor(input: boolean | ComponentProps<DestructibleByMiningBlockComponent>) {
        super();
        if (typeof input === "boolean") {
            this.enabled = input;
        } else {
            Object.assign(this, input);
        }
    }
}

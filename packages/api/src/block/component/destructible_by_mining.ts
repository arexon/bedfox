import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

export interface ItemSpecificSpeed {
    item?: string;

    destroySpeed?: number;
}

@serialize
export class DestructibleByMiningBlockComponent extends Component {
    static override readonly componentId = "minecraft:destructible_by_mining";

    declare readonly [BRAND]: typeof DestructibleByMiningBlockComponent.componentId;

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

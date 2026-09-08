import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import { multiAutoInstance } from "../../_utils.ts";

@Ser()
export class ItemSpecificSpeed {
    @Ser()
    item?: string;

    @Ser()
    destroySpeed?: number;
}

@Ser({ transparent: "enabled" })
export class DestructibleByMiningBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:destructible_by_mining";
    }

    @Ser()
    private enabled?: boolean;

    @Ser()
    secondsToDestroy?: number;

    @Ser({
        default: () => [],
        custom: (v) => multiAutoInstance(ItemSpecificSpeed, v),
    })
    itemSpecificSpeeds: ItemSpecificSpeed[] = [];

    constructor(enabled: boolean);
    constructor(props: ComponentProps<DestructibleByMiningBlockComponent>);
    constructor(
        input: boolean | ComponentProps<DestructibleByMiningBlockComponent>,
    ) {
        super();
        if (typeof input === "boolean") {
            this.enabled = input;
        } else {
            Object.assign(this, input);
        }
    }
}

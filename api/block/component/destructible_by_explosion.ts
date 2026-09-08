import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser({ transparent: "enabled" })
export class DestructibleByExplosionBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:destructible_by_explosion";
    }

    @Ser()
    enabled?: boolean;

    @Ser()
    explosionResistance?: number;

    constructor(enabled: boolean);
    constructor(props: ComponentProps<DestructibleByExplosionBlockComponent>);
    constructor(
        input: boolean | ComponentProps<DestructibleByExplosionBlockComponent>,
    ) {
        super();
        if (typeof input === "boolean") {
            this.enabled = input;
        } else {
            Object.assign(this, input);
        }
    }
}

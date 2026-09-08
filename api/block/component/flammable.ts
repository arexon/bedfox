import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

export enum LavaFlammable {
    Always = "always",
    Never = "never",
}

@Ser({ transparent: "enabled" })
export class FlammableBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:flammable";
    }

    @Ser()
    enabled?: boolean;

    @Ser({ default: () => 5 })
    catchChanceModifier?: number;

    @Ser({ default: () => 20 })
    destroyChanceModifier?: number;

    @Ser({ default: () => LavaFlammable.Never })
    lavaFlammable?: LavaFlammable;

    constructor(enabled: boolean);
    constructor(props: ComponentProps<FlammableBlockComponent>);
    constructor(input: boolean | ComponentProps<FlammableBlockComponent>) {
        super();
        if (typeof input === "boolean") {
            this.enabled = input;
        } else {
            Object.assign(this, input);
        }
    }
}

import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

/** Whether lava can set the block on fire. */
export type LavaFlammable = "always" | "never";

@serialize
export class FlammableBlockComponent extends Component {
    static override readonly componentId = "minecraft:flammable";

    declare readonly [BRAND]: typeof FlammableBlockComponent.componentId;

    @serialize({ transparent: true })
    enabled?: boolean;

    /** @default 5 */
    catchChanceModifier?: number;

    /** @default 20 */
    destroyChanceModifier?: number;

    /** @default "never" */
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

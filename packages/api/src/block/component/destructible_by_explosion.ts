import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class DestructibleByExplosionBlockComponent extends Component {
    static override readonly componentId = "minecraft:destructible_by_explosion";

    declare readonly [BRAND]: typeof DestructibleByExplosionBlockComponent.componentId;

    @serialize({ transparent: true })
    enabled?: boolean;

    explosionResistance?: number;

    constructor(enabled: boolean);
    constructor(props: ComponentProps<DestructibleByExplosionBlockComponent>);
    constructor(input: boolean | ComponentProps<DestructibleByExplosionBlockComponent>) {
        super();
        if (typeof input === "boolean") {
            this.enabled = input;
        } else {
            Object.assign(this, input);
        }
    }
}

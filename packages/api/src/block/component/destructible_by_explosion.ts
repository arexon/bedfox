import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class DestructibleByExplosionBlockComponent extends Component.of(
    "minecraft:destructible_by_explosion",
) {
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

import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class RedstoneConductivityBlockComponent extends Component.of(
    "minecraft:redstone_conductivity",
) {
    /** @default false */
    redstoneConductor?: boolean;

    /** @default true */
    allowsWireToStepDown?: boolean;

    constructor(props: ComponentProps<RedstoneConductivityBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

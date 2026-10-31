import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class RedstoneConductivityBlockComponent extends Component {
    static override readonly componentId = "minecraft:redstone_conductivity";

    declare readonly [BRAND]: typeof RedstoneConductivityBlockComponent.componentId;

    /** @default false */
    redstoneConductor?: boolean;

    /** @default true */
    allowsWireToStepDown?: boolean;

    constructor(props: ComponentProps<RedstoneConductivityBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

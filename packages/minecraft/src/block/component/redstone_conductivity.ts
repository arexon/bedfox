import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";

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

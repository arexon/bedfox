import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";

export type ObstructionRule = "always" | "never" | "shape";

@serialize
export class ChestObstructionBlockComponent extends Component {
    static override readonly componentId = "minecraft:chest_obstruction";

    declare readonly [BRAND]: typeof ChestObstructionBlockComponent.componentId;

    /** @default "shape" */
    obstructionRule?: ObstructionRule;

    constructor(props: ComponentProps<ChestObstructionBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

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

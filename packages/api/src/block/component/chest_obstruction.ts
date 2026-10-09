import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

export type ObstructionRule = "always" | "never" | "shape";

@serialize
export class ChestObstructionBlockComponent extends Component.of("minecraft:chest_obstruction") {
    /** @default "shape" */
    obstructionRule?: ObstructionRule;

    constructor(props: ComponentProps<ChestObstructionBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

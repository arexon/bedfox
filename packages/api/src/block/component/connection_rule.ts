import { Component, type ComponentProps } from "#/core/component";
import type { CardinalDirection } from "#/primitive/index";
import { serialize } from "#/serialize";

export type ConnectionSource = "none" | "only_fences" | "all";

@serialize
export class ConnectionRuleBlockComponent extends Component.of("minecraft:connection_rule") {
    /** @default "all" */
    acceptsConnectionsFrom?: ConnectionSource;

    /** @default ["north", "east", "south", "west"] */
    enabledDirections?: CardinalDirection[];

    constructor(props: ComponentProps<ConnectionRuleBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

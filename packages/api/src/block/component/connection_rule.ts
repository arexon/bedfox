import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";
import type { CardinalDirection } from "#/primitive/index";

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

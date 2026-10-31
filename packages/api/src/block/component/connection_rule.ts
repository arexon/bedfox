import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import type { CardinalDirection } from "#/primitive/index";
import { serialize } from "#/serialize";

export type ConnectionSource = "none" | "only_fences" | "all";

@serialize
export class ConnectionRuleBlockComponent extends Component {
    static override readonly componentId = "minecraft:connection_rule";

    declare readonly [BRAND]: typeof ConnectionRuleBlockComponent.componentId;

    /** @default "all" */
    acceptsConnectionsFrom?: ConnectionSource;

    /** @default ["north", "east", "south", "west"] */
    enabledDirections?: CardinalDirection[];

    constructor(props: ComponentProps<ConnectionRuleBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

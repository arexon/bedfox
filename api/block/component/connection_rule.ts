import {
    CardinalDirection,
    Component,
    type ComponentProps,
} from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

export enum ConnectionSource {
    None = "none",
    OnlyFences = "only_fences",
    All = "all",
}

@Ser()
export class ConnectionRuleBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:connection_rule";
    }

    @Ser({ default: () => ConnectionSource.All })
    acceptsConnectionsFrom?: ConnectionSource;

    @Ser({
        default: () => [
            CardinalDirection.North,
            CardinalDirection.East,
            CardinalDirection.South,
            CardinalDirection.West,
        ],
    })
    enabledDirections?: CardinalDirection[];

    constructor(props: ComponentProps<ConnectionRuleBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

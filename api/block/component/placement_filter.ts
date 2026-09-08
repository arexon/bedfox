import {
    BlockDescriptor,
    type BlockDescriptorRef,
    Component,
    type Direction,
} from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import { multiAutoInstance } from "../../_utils.ts";

@Ser()
export class PlacementCondition {
    @Ser()
    allowedFaces: Direction[] = [];

    @Ser({
        custom: (v) =>
            multiAutoInstance(
                BlockDescriptor,
                v,
                (v) => typeof v !== "string",
            ),
    })
    blockFilter: BlockDescriptorRef[] = [];

    constructor(props: PlacementCondition) {
        Object.assign(this, props);
    }
}

@Ser()
export class PlacementFilterBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:placement_filter";
    }

    @Ser({
        default: () => [],
        custom: (v) => multiAutoInstance(PlacementCondition, v),
    })
    conditions: PlacementCondition[] = [];

    constructor(...conditions: PlacementCondition[]) {
        super();
        this.conditions = conditions;
    }
}

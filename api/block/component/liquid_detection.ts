import {
    Component,
    type ComponentProps,
    type Direction,
} from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import { multiAutoInstance } from "../../_utils.ts";

@Ser()
export class DetectionRule {
    @Ser()
    liquidType?: "water";

    @Ser()
    canContainLiquid?: boolean;

    @Ser()
    onLiquidTouches?: "broken" | "popped" | "blocking" | "no_reaction";

    @Ser()
    stopsLiquidFlowingFromDirection?: Direction[];

    @Ser()
    useLiquidClipping?: boolean;

    constructor(props: DetectionRule) {
        Object.assign(this, props);
    }
}

@Ser()
export class LiquidDetectionBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:liquid_detection";
    }

    @Ser({
        custom: (v) => multiAutoInstance(DetectionRule, v),
    })
    detectionRules: DetectionRule[] = [];

    constructor(props: ComponentProps<LiquidDetectionBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";
import type { Direction } from "#/primitive/index";

export interface DetectionRule {
    liquidType?: "water";

    canContainLiquid?: boolean;

    onLiquidTouches?: "broken" | "popped" | "blocking" | "no_reaction";

    stopsLiquidFlowingFromDirection?: Direction[];

    useLiquidClipping?: boolean;
}

@serialize
export class LiquidDetectionBlockComponent extends Component.of("minecraft:liquid_detection") {
    detectionRules?: DetectionRule[] = [];

    constructor(props: ComponentProps<LiquidDetectionBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

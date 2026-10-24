import { Component, type ComponentProps } from "#/core/component";
import type { Direction } from "#/primitive/index";
import { serialize } from "#/serialize";

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

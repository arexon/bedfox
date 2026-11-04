import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";
import type { Direction } from "#/primitive/index";

export interface DetectionRule {
    liquidType?: "water";

    canContainLiquid?: boolean;

    onLiquidTouches?: "broken" | "popped" | "blocking" | "no_reaction";

    stopsLiquidFlowingFromDirection?: Direction[];

    useLiquidClipping?: boolean;
}

@serialize
export class LiquidDetectionBlockComponent extends Component {
    static override readonly componentId = "minecraft:liquid_detection";

    declare readonly [BRAND]: typeof LiquidDetectionBlockComponent.componentId;

    detectionRules?: DetectionRule[] = [];

    constructor(props: ComponentProps<LiquidDetectionBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps } from "#/common/index";

export enum PrecipitationBehavior {
    None = "none",
    ObstructRain = "obstruct_rain",
    ObstructRainAccumulateSnow = "obstruct_rain_accumulate_snow",
    Snowlogging = "snowlogging",
}

@Ser()
export class PrecipitationInteractionsBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:precipitation_interactions";
    }

    @Ser()
    precipitationBehavior?: PrecipitationBehavior;

    constructor(props: ComponentProps<PrecipitationInteractionsBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

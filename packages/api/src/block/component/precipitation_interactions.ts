import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

export type PrecipitationBehavior =
    | "none"
    | "obstruct_rain"
    | "obstruct_rain_accumulate_snow"
    | "snowlogging";

@serialize
export class PrecipitationInteractionsBlockComponent extends Component {
    static override readonly componentId = "minecraft:precipitation_interactions";

    declare readonly [BRAND]: typeof PrecipitationInteractionsBlockComponent.componentId;

    precipitationBehavior?: PrecipitationBehavior;

    constructor(props: ComponentProps<PrecipitationInteractionsBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

export type PrecipitationBehavior =
    | "none"
    | "obstruct_rain"
    | "obstruct_rain_accumulate_snow"
    | "snowlogging";

@serialize
export class PrecipitationInteractionsBlockComponent extends Component.of(
    "minecraft:precipitation_interactions",
) {
    precipitationBehavior?: PrecipitationBehavior;

    constructor(props: ComponentProps<PrecipitationInteractionsBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

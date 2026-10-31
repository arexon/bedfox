import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class SoundBlockComponent extends Component {
    static override readonly componentId = "minecraft:sound";

    declare readonly [BRAND]: typeof SoundBlockComponent.componentId;

    sound?: string;

    constructor(props: ComponentProps<SoundBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

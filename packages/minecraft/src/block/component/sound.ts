import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";

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

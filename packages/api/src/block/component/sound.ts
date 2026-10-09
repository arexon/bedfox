import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class SoundBlockComponent extends Component.of("minecraft:sound") {
    sound?: string;

    constructor(props: ComponentProps<SoundBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

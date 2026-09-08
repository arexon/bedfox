import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser()
export class SoundBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:sound";
    }

    @Ser()
    sound?: string;

    constructor(props: ComponentProps<SoundBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

import {
    Color,
    Component,
    type ComponentProps,
    TintMethod,
} from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser({ transparent: "color" })
export class MapColorBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:map_color";
    }

    @Ser({ custom: Color.CUSTOM_SER.HEX })
    color?: Color;

    @Ser({ default: () => TintMethod.None })
    tintMethod?: TintMethod;

    constructor(color: Color);
    constructor(props: ComponentProps<MapColorBlockComponent>);
    constructor(input: Color | ComponentProps<MapColorBlockComponent>) {
        super();
        if (input instanceof Color) {
            this.color = input;
        } else {
            Object.assign(this, input);
        }
    }
}

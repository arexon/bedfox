import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import { autoInstance } from "../../_utils.ts";

@Ser()
export class NWayVisualRotation {
    @Ser()
    x?: string;

    @Ser()
    y?: string;

    @Ser()
    z?: string;

    constructor(props: NWayVisualRotation) {
        Object.assign(this, props);
    }
}

@Ser({ transparent: "identifier" })
export class GeometryBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:geometry";
    }

    @Ser()
    identifier?: string;

    @Ser()
    culling?: string;

    @Ser()
    cullingShape?: string;

    @Ser()
    cullingLayer?: string;

    @Ser({ default: () => ({}) })
    boneVisibility?: Record<string, string>;

    @Ser({ default: () => false })
    uvLock?: boolean | string[];

    @Ser({ custom: (v) => autoInstance(NWayVisualRotation, v) })
    nWayVisualRotation?: NWayVisualRotation;

    constructor(identifier: string);
    constructor(props: ComponentProps<GeometryBlockComponent>);
    constructor(input: string | ComponentProps<GeometryBlockComponent>) {
        super();
        if (typeof input === "string") {
            this.identifier = input;
        } else {
            Object.assign(this, input);
        }
    }
}

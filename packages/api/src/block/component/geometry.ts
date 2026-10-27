import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

export interface NWayVisualRotation {
    x?: string;

    y?: string;

    z?: string;
}

@serialize
export class GeometryBlockComponent extends Component {
    static override readonly componentId = "minecraft:geometry";

    declare readonly [BRAND]: typeof GeometryBlockComponent.componentId;

    @serialize({ transparent: true })
    identifier?: string;

    culling?: string;

    cullingShape?: string;

    cullingLayer?: string;

    @serialize({ keepKeys: true })
    boneVisibility?: Record<string, string>;

    /** @default false */
    uvLock?: boolean | string[];

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

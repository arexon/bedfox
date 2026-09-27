import { Component, Vec3 } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import { multiAutoInstance } from "../../_utils.ts";

@Ser()
export class BoundingBox {
    @Ser({ custom: Vec3.CUSTOM_SER.TUPLE })
    origin!: Vec3;

    @Ser({ custom: Vec3.CUSTOM_SER.TUPLE })
    size!: Vec3;

    constructor(props: BoundingBox) {
        Object.assign(this, props);
    }

    static cube(): BoundingBox {
        return new BoundingBox({
            origin: new Vec3(-8, 0, -8),
            size: new Vec3(16, 16, 16),
        });
    }

    static slab(): BoundingBox {
        return new BoundingBox({
            origin: new Vec3(-8, 0, -8),
            size: new Vec3(16, 8, 16),
        });
    }
}

@Ser({ transparent: "value" })
export class CollisionBoxBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:collision_box";
    }

    // TODO: Add min/max
    @Ser({
        default: () => true,
        custom: (v) =>
            typeof v === "boolean" ? v : multiAutoInstance(BoundingBox, v),
    })
    value!: boolean | BoundingBox[];

    constructor(enabled: boolean);
    constructor(...boxes: BoundingBox[]);
    constructor(
        first: boolean | BoundingBox,
        ...rest: BoundingBox[]
    ) {
        super();
        if (typeof first !== "boolean") this.value = [first, ...rest];
        else this.value = first;
    }

    addBox(...boxes: BoundingBox[]): this {
        if (Array.isArray(this.value)) this.value.push(...boxes);
        else this.value = boxes;
        return this;
    }
}

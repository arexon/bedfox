import { Component, type ComponentProps, Range } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import { autoInstance } from "../../_utils.ts";

@Ser()
export class RangeAndSteps {
    @Ser({ custom: Range.CUSTOM_SER.OBJECT })
    range?: Range;

    @Ser()
    steps?: number;

    constructor(props: RangeAndSteps) {
        Object.assign(this, props);
    }
}

@Ser()
export class RandomOffsetBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:random_offset";
    }

    @Ser({
        custom: (v) => autoInstance(RangeAndSteps, v),
    })
    x?: RangeAndSteps;

    @Ser({
        custom: (v) => autoInstance(RangeAndSteps, v),
    })
    y?: RangeAndSteps;

    @Ser({
        custom: (v) => autoInstance(RangeAndSteps, v),
    })
    z?: RangeAndSteps;

    constructor(props: ComponentProps<RandomOffsetBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

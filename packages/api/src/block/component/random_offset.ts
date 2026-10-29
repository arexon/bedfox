import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import type { Range } from "#/primitive/index";
import { serialize } from "#/serialize";

/** An offset range along one axis, split into `steps` positions. */
export interface RangeAndSteps {
    range?: Range;

    steps?: number;
}

@serialize
export class RandomOffsetBlockComponent extends Component {
    static override readonly componentId = "minecraft:random_offset";

    declare readonly [BRAND]: typeof RandomOffsetBlockComponent.componentId;

    @serialize({ override: serAxis })
    x?: RangeAndSteps;

    @serialize({ override: serAxis })
    y?: RangeAndSteps;

    @serialize({ override: serAxis })
    z?: RangeAndSteps;

    constructor(props: ComponentProps<RandomOffsetBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

function serAxis(axis?: RangeAndSteps): unknown {
    if (axis === undefined || (axis.range === undefined && axis.steps === undefined)) {
        return undefined;
    }
    // Spreading keeps `range` where the caller put it, so the key order doesn't change.
    return { ...axis, range: axis.range?.toObject() };
}

import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";
import type { Range } from "#/primitive/index";

/** An offset range along one axis, split into `steps` positions. */
export interface RangeAndSteps {
    range?: Range;

    steps?: number;
}

@serialize
export class RandomOffsetBlockComponent extends Component.of("minecraft:random_offset") {
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

/** An axis with its `range` as `{ min, max }` rather than a tuple, omitted when empty. */
function serAxis(axis?: RangeAndSteps): unknown {
    if (axis === undefined || (axis.range === undefined && axis.steps === undefined)) {
        return undefined;
    }
    // Spreading keeps `range` where the caller put it, so the key order doesn't change.
    return { ...axis, range: axis.range?.toObject() };
}

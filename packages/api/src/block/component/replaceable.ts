import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class ReplaceableBlockComponent extends Component {
    static override readonly componentId = "minecraft:replaceable";

    declare readonly [BRAND]: typeof ReplaceableBlockComponent.componentId;
}

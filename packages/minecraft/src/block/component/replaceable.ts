import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component } from "#/component/component";

@serialize
export class ReplaceableBlockComponent extends Component {
    static override readonly componentId = "minecraft:replaceable";

    declare readonly [BRAND]: typeof ReplaceableBlockComponent.componentId;
}

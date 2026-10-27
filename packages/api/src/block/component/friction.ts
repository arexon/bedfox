import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class FrictionBlockComponent extends Component {
    static override readonly componentId = "minecraft:friction";

    declare readonly [BRAND]: typeof FrictionBlockComponent.componentId;

    @serialize({ transparent: true })
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}

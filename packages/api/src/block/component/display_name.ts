import { Component } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class DisplayNameBlockComponent extends Component.of("minecraft:display_name") {
    @serialize({ transparent: true })
    value?: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}

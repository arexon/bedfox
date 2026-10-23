import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class FlowerPottableBlockComponent extends Component.of("minecraft:flower_pottable") {}

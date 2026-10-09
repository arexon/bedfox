import { Component } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class ReplaceableBlockComponent extends Component.of("minecraft:replaceable") {}

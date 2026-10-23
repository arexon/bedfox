import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class ReplaceableBlockComponent extends Component.of("minecraft:replaceable") {}

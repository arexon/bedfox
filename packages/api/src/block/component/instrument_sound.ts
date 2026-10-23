import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

export type Instrument =
    | "note.harp"
    | "note.bd"
    | "note.snare"
    | "note.hat"
    | "note.bassattack"
    | "note.flute"
    | "note.bell"
    | "note.guitar"
    | "note.chime"
    | "note.xylophone"
    | "note.iron_xylophone"
    | "note.cow_bell"
    | "note.didgeridoo"
    | "note.bit"
    | "note.banjo"
    | "note.pling"
    | "note.trumpet"
    | "note.trumpet_exposed"
    | "note.trumpet_weathered"
    | "note.trumpet_oxidized"
    | "note.zombie"
    | "note.skeleton"
    | "note.creeper"
    | "note.enderdragon"
    | "note.witherskeleton"
    | "note.piglin"
    | "note.none";

@serialize
export class InstrumentSoundBlockComponent extends Component.of("minecraft:instrument_sound") {
    up?: Instrument;

    down?: Instrument;

    constructor(props: ComponentProps<InstrumentSoundBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

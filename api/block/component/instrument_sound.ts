import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

export const enum Instrument {
    Harp = "note.harp",
    Bd = "note.bd",
    Snare = "note.snare",
    Hat = "note.hat",
    Bassattack = "note.bassattack",
    Flute = "note.flute",
    Bell = "note.bell",
    Guitar = "note.guitar",
    Chime = "note.chime",
    Xylophone = "note.xylophone",
    IronXylophone = "note.iron_xylophone",
    CowBell = "note.cow_bell",
    Didgeridoo = "note.didgeridoo",
    Bit = "note.bit",
    Banjo = "note.banjo",
    Pling = "note.pling",
    Trumpet = "note.trumpet",
    TrumpetExposed = "note.trumpet_exposed",
    TrumpetWeathered = "note.trumpet_weathered",
    TrumpetOxidized = "note.trumpet_oxidized",
    Zombie = "note.zombie",
    Skeleton = "note.skeleton",
    Creeper = "note.creeper",
    Enderdragon = "note.enderdragon",
    Witherskeleton = "note.witherskeleton",
    Piglin = "note.piglin",
    None = "note.none",
}

@Ser()
export class InstrumentSoundBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:instrument_sound";
    }

    @Ser()
    up?: Instrument;

    @Ser()
    down?: Instrument;

    constructor(props: ComponentProps<InstrumentSoundBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}

/** A choice in a dropdown or multiselect setting, as a manifest writes it. */
export interface SettingOption {
    /** The setting's value when a player picks this option, e.g. `high`. */
    name: string;
    /** What players see, e.g. `High`. */
    text: string;
}

/** A setting players can change in a pack's settings screen, added with `setting()`. */
export type Setting =
    | LabelSetting
    | ToggleSetting
    | SliderSetting
    | DropdownSetting
    | MultiSelectSetting;

/** Read-only text, e.g. to describe or separate other settings. */
export class LabelSetting {
    readonly text: string;

    constructor(text: string) {
        this.text = text;
    }

    toJSON(): unknown {
        return { type: "label", text: this.text };
    }
}

/**
 * What every named setting has. `name` has a namespace, e.g. `example:power`. The namespace can't
 * be `minecraft`, and `name` is unique in its manifest. `text` is what players see.
 */
abstract class NamedSetting {
    readonly name: string;
    readonly text: string;

    constructor(name: string, text: string) {
        this.name = name;
        this.text = text;
    }
}

/** An on/off switch. It starts off unless `default()` sets it on. */
export class ToggleSetting extends NamedSetting {
    #default = false;

    /** Sets whether the switch starts on. */
    default(on: boolean): this {
        this.#default = on;
        return this;
    }

    toJSON(): unknown {
        return { type: "toggle", name: this.name, text: this.text, default: this.#default };
    }
}

/**
 * A number that players pick from `min` to `max`, where `min` is less than `max`. It moves in steps
 * of 1 unless `step()` sets another step. It starts at `min` unless `default()` sets another
 * value.
 */
export class SliderSetting extends NamedSetting {
    readonly min: number;
    readonly max: number;

    #step = 1;
    #default?: number;

    constructor(name: string, text: string, min: number, max: number) {
        super(name, text);
        this.min = min;
        this.max = max;
    }

    /** Sets the distance between notches, more than 0 and at most `max - min`. */
    step(step: number): this {
        this.#step = step;
        return this;
    }

    /** Sets where the slider starts, from `min` to `max`. */
    default(value: number): this {
        this.#default = value;
        return this;
    }

    toJSON(): unknown {
        return {
            type: "slider",
            name: this.name,
            text: this.text,
            min: this.min,
            max: this.max,
            step: this.#step,
            default: this.#default ?? this.min,
        };
    }
}

/**
 * A list of 2 to 20 options that players pick one from. It starts on the first option unless
 * `default()` sets another.
 */
export class DropdownSetting extends NamedSetting {
    #options: SettingOption[] = [];
    #default?: string;

    /** Adds an option. Its `name` is the setting's value when a player picks it. */
    option(name: string, text: string): this {
        this.#options.push({ name, text });
        return this;
    }

    /** Sets which option, by name, the dropdown starts on. */
    default(name: string): this {
        this.#default = name;
        return this;
    }

    toJSON(): unknown {
        return {
            type: "dropdown",
            name: this.name,
            text: this.text,
            options: this.#options,
            default: this.#default ?? this.#options[0]?.name,
        };
    }
}

/**
 * A list of 2 to 20 options that players pick any number from. It starts with no options picked
 * unless `defaults()` picks some.
 */
export class MultiSelectSetting extends NamedSetting {
    #options: SettingOption[] = [];
    #defaults: string[] = [];
    #selectionText?: string;

    /** Adds an option. Its `name` is in the setting's value when a player picks it. */
    option(name: string, text: string): this {
        this.#options.push({ name, text });
        return this;
    }

    /** Picks options, by name, to start with. */
    defaults(...names: string[]): this {
        this.#defaults.push(...names);
        return this;
    }

    /** Sets the text that describes the picked options. */
    selectionText(text: string): this {
        this.#selectionText = text;
        return this;
    }

    toJSON(): unknown {
        return {
            type: "multiselect",
            name: this.name,
            text: this.text,
            options: this.#options,
            // The game requires this field, so write it even when it's empty.
            defaults: this.#defaults,
            selection_text: this.#selectionText,
        };
    }
}

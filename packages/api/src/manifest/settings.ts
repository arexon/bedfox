/** An option in a {@link DropdownSetting} or a {@link MultiSelectSetting}. */
export interface SettingOption {
    /** The value of the option, e.g. `high`. */
    name: string;
    /** The text that players see, e.g. `High`. */
    text: string;
}

/** A setting in a pack's settings screen, for `Manifest.setting()`. */
export type Setting =
    | LabelSetting
    | ToggleSetting
    | SliderSetting
    | DropdownSetting
    | MultiSelectSetting;

/** Text that players can't change, e.g. to describe or separate other settings. */
export class LabelSetting {
    /** The text that players see. */
    readonly text: string;

    /** Creates a label that shows `text`. */
    constructor(text: string) {
        this.text = text;
    }

    toJSON(): unknown {
        return { type: "label", text: this.text };
    }
}

abstract class NamedSetting {
    /** The setting's identifier, e.g. `example:explosions`. */
    readonly name: string;
    /** The text that players see next to the setting. */
    readonly text: string;

    /** Creates a setting with an identifier and the text that players see. */
    constructor(name: string, text: string) {
        this.name = name;
        this.text = text;
    }
}

/** A switch that players turn on or off. */
export class ToggleSetting extends NamedSetting {
    #default = false;

    /**
     * Sets whether the switch starts on.
     *
     * @default false
     */
    default(on: boolean): this {
        this.#default = on;
        return this;
    }

    toJSON(): unknown {
        return { type: "toggle", name: this.name, text: this.text, default: this.#default };
    }
}

/** A slider that players move to select a number. */
export class SliderSetting extends NamedSetting {
    readonly min: number;
    readonly max: number;

    #step = 1;
    #default?: number;

    /**
     * Creates a slider from `min` to `max`.
     *
     * `min` must be less than `max`.
     */
    constructor(name: string, text: string, min: number, max: number) {
        super(name, text);
        this.min = min;
        this.max = max;
    }

    /**
     * Sets the distance between two values on the slider. It must be more than 0 and at most `max -
     * min`.
     *
     * @default 1
     */
    step(step: number): this {
        this.#step = step;
        return this;
    }

    /**
     * Sets the value that the slider starts at, from `min` to `max`.
     *
     * By default, the slider starts at `min`.
     */
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
 * A list of options that players select one option from.
 *
 * A dropdown must have 2 to 20 options.
 */
export class DropdownSetting extends NamedSetting {
    #options: SettingOption[] = [];
    #default?: string;

    /** Adds an option. When a player selects the option, `name` is the setting's value. */
    option(name: string, text: string): this {
        this.#options.push({ name, text });
        return this;
    }

    /**
     * Sets the option that the dropdown starts on, by its name.
     *
     * By default, the dropdown starts on the first option.
     */
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
 * A list of options that players select any number of options from.
 *
 * A multiselect must have 2 to 20 options.
 */
export class MultiSelectSetting extends NamedSetting {
    #options: SettingOption[] = [];
    #defaults: string[] = [];
    #selectionText?: string;

    /** Adds an option. When a player selects the option, `name` is in the setting's value. */
    option(name: string, text: string): this {
        this.#options.push({ name, text });
        return this;
    }

    /**
     * Selects options at the start, by their names.
     *
     * By default, the setting starts with no options selected.
     */
    defaults(...names: string[]): this {
        this.#defaults.push(...names);
        return this;
    }

    /** Sets the text that describes the selected options. */
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

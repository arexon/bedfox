/** A choice in a dropdown or multiselect setting, as a manifest writes it. */
export interface SettingOption {
    /** What the setting's value is when this is picked, e.g. `high`. */
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
 * What every named setting has. `name` is namespaced, e.g. `example:power`, can't use `minecraft`,
 * and is unique in its manifest. `text` is what players see.
 */
abstract class NamedSetting {
    readonly name: string;
    readonly text: string;

    constructor(name: string, text: string) {
        this.name = name;
        this.text = text;
    }
}

/** An on/off switch. It starts off unless set. */
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
 * A number players pick from `min` to `max`, where `min` is less than `max`. It moves in steps of 1
 * and starts at `min` unless set.
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

/** A list players pick one of 2 to 20 options from. It starts on the first option unless set. */
export class DropdownSetting extends NamedSetting {
    #options: SettingOption[] = [];
    #default?: string;

    /** Adds an option. Its `name` is the setting's value when it's picked. */
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

/** A list players pick any number of 2 to 20 options from. Nothing is picked unless set. */
export class MultiSelectSetting extends NamedSetting {
    #options: SettingOption[] = [];
    #defaults: string[] = [];
    #selectionText?: string;

    /** Adds an option. Its `name` is in the setting's value when it's picked. */
    option(name: string, text: string): this {
        this.#options.push({ name, text });
        return this;
    }

    /** Picks options, by name, to start with. */
    defaults(...names: string[]): this {
        this.#defaults.push(...names);
        return this;
    }

    /** Sets the text that describes what's picked. */
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
            // A required field, so it's written even when nothing is picked.
            defaults: this.#defaults,
            selection_text: this.#selectionText,
        };
    }
}

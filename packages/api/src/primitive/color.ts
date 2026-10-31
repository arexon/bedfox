/** Thrown by the {@link Color} constructor when a hex string isn't a valid color. */
export class InvalidHexColorError extends TypeError {
    constructor(input: string) {
        super(`Invalid hex color: ${input}`);
        this.name = "InvalidHexColorError";
    }
}

/** Thrown by the {@link Color} constructor when a channel isn't a number from 0 to 255. */
export class InvalidColorChannelError extends RangeError {
    constructor(value: number) {
        super(`Color channel must be a finite number between 0 and 255: ${value}`);
        this.name = "InvalidColorChannelError";
    }
}

/**
 * A color with red, green, blue and alpha channels from 0 to 255.
 *
 * @example
 *     const orange = new Color("#ff8000");
 *     const glass = new Color(255, 255, 255, 64);
 */
export class Color {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    /** The alpha channel, from 0 for transparent to 255 for opaque. */
    readonly a: number;

    /**
     * Creates a color from a hex string: `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`.
     *
     * Letters can be upper or lower case. Without an alpha channel, the color is opaque.
     *
     * @throws - {@link InvalidHexColorError} if `hex` isn't in one of these forms.
     */
    constructor(hex: string);
    /**
     * Creates an opaque color from its channels. Each channel rounds to the nearest integer.
     *
     * @throws - {@link InvalidColorChannelError} if a channel isn't a number from 0 to 255.
     */
    constructor(r: number, g: number, b: number);
    /**
     * Creates a color from its channels. Each channel rounds to the nearest integer.
     *
     * @throws - {@link InvalidColorChannelError} if a channel isn't a number from 0 to 255.
     */
    constructor(r: number, g: number, b: number, a: number);
    constructor(rOrHex: number | string, g?: number, b?: number, a?: number) {
        if (typeof rOrHex === "string") {
            const [r, g, b, a] = hexToRgba(rOrHex);
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
            return;
        }

        this.r = toU8(rOrHex);
        this.g = toU8(g!);
        this.b = toU8(b!);
        this.a = toU8(a ?? 255);
    }

    /** Returns `[r, g, b]`. */
    toRgb(): [number, number, number] {
        return [this.r, this.g, this.b];
    }

    /** Returns `[r, g, b, a]`. */
    toRgba(): [number, number, number, number] {
        return [this.r, this.g, this.b, this.a];
    }

    /** Returns the color as `#rrggbb`, or as `#rrggbbaa` if the color isn't opaque. */
    toHex(): string {
        return rgbaToHex(this.r, this.g, this.b, this.a);
    }

    toJSON(): string {
        return this.toHex();
    }
}

const HEX_PATTERN = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

function hexToRgba(input: string): [number, number, number, number] {
    const match = HEX_PATTERN.exec(input);
    if (!match) throw new InvalidHexColorError(input);

    let hex = match[1];
    if (hex.length <= 4) {
        hex = hex
            .split("")
            .map((digit) => digit.repeat(2))
            .join("");
    }
    hex = hex.padEnd(8, "f");

    return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
        Number.parseInt(hex.slice(6, 8), 16),
    ];
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
    const channels = a === 255 ? [r, g, b] : [r, g, b, a];
    return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function toU8(value: number): number {
    if (!Number.isFinite(value) || value < 0 || value > 255) {
        throw new InvalidColorChannelError(value);
    }
    return Math.round(value);
}

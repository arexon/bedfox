/** An error caused by an invalid hex color. */
export class InvalidHexColorError extends TypeError {
    constructor(input: string) {
        super(`Invalid hex color: ${input}`);
    }
}

/** An error caused by a color channel outside the u8 range. */
export class InvalidColorChannelError extends RangeError {
    constructor(value: number) {
        super(
            `Color channel must be a finite number between 0 and 255: ${value}`,
        );
    }
}

export class Color {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;

    constructor(hex: string);
    constructor(r: number, g: number, b: number);
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

    static CUSTOM_SER: {
        RGB(v: Color): [number, number, number];
        RGBA(v: Color): [number, number, number, number];
        HEX(v: Color): string;
    } = {
        RGB: (v) => [v.r, v.g, v.b],
        RGBA: (v) => [v.r, v.g, v.b, v.a],
        HEX: (v) => rgbaToHex(v.r, v.g, v.b, v.a),
    };
}

const HEX_PATTERN = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

function hexToRgba(input: string): [number, number, number, number] {
    const match = HEX_PATTERN.exec(input);
    if (!match) throw new InvalidHexColorError(input);

    let hex = match[1];
    if (hex.length <= 4) {
        hex = [...hex].map((digit) => digit.repeat(2)).join("");
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
    return `#${
        channels
            .map((channel) => channel.toString(16).padStart(2, "0"))
            .join("")
    }`;
}

function toU8(value: number): number {
    if (!Number.isFinite(value) || value < 0 || value > 255) {
        throw new InvalidColorChannelError(value);
    }
    return Math.round(value);
}

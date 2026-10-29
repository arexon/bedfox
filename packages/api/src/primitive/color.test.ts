import { describe, expect, test } from "vite-plus/test";

import { Color, InvalidColorChannelError, InvalidHexColorError } from "#/primitive/color";

function json(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
}

describe(Color.name, () => {
    test("RGBA rounds channels to u8", () => {
        const color = new Color(12.4, 127.5, 254.6, 4.4);
        expect([color.r, color.g, color.b, color.a]).toStrictEqual([12, 128, 255, 4]);
    });

    describe("invalid", () => {
        test("channels", () => {
            expect(() => new Color(-1, 0, 0)).toThrow(InvalidColorChannelError);
            expect(() => new Color(0, 0, 256)).toThrow(InvalidColorChannelError);
            expect(() => new Color(0, 0, Number.NaN)).toThrow(InvalidColorChannelError);
        });

        test("hex", () => {
            expect(() => new Color("123456")).toThrow(InvalidHexColorError);
            expect(() => new Color("#xyz")).toThrow(InvalidHexColorError);
        });
    });

    test("direct rgb", () => {
        expect(json(new Color(10, 20, 30))).toBe("#0a141e");
    });

    describe("converts", () => {
        for (const [label, color, rgb, rgba, hex] of [
            ["rgb", new Color(255, 128, 0), [255, 128, 0], [255, 128, 0, 255], "#ff8000"],
            ["rgba", new Color(255, 128, 0, 64), [255, 128, 0], [255, 128, 0, 64], "#ff800040"],
            ["hex3", new Color("#f80"), [255, 136, 0], [255, 136, 0, 255], "#ff8800"],
            ["hex4", new Color("#f808"), [255, 136, 0], [255, 136, 0, 136], "#ff880088"],
            ["hex6", new Color("#FF8000"), [255, 128, 0], [255, 128, 0, 255], "#ff8000"],
            ["hex8", new Color("#ff800040"), [255, 128, 0], [255, 128, 0, 64], "#ff800040"],
        ] as const) {
            test(label, () => {
                expect(color.toRgb()).toStrictEqual(rgb);
                expect(color.toRgba()).toStrictEqual(rgba);
                expect(color.toHex()).toBe(hex);
            });
        }
    });
});

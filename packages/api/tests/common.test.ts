import { describe, expect, test } from "vite-plus/test";

import { Color, InvalidColorChannelError, InvalidHexColorError } from "#/common/index";

describe("Color", () => {
    test("RGB defaults alpha to 255", () => {
        const color = new Color(12, 34, 56);
        expect([color.r, color.g, color.b, color.a]).toStrictEqual([12, 34, 56, 255]);
    });

    test("RGBA rounds channels to u8", () => {
        const color = new Color(12.4, 127.5, 254.6, 4.4);
        expect([color.r, color.g, color.b, color.a]).toStrictEqual([12, 128, 255, 4]);
    });

    test("invalid channels", () => {
        expect(() => new Color(-1, 0, 0)).toThrow(InvalidColorChannelError);
        expect(() => new Color(0, 0, 256)).toThrow(InvalidColorChannelError);
        expect(() => new Color(0, 0, Number.NaN)).toThrow(InvalidColorChannelError);
    });

    test("short hex", () => {
        const rgb = new Color("#abc");
        const rgba = new Color("#abcd");

        expect([rgb.r, rgb.g, rgb.b, rgb.a]).toStrictEqual([170, 187, 204, 255]);
        expect([rgba.r, rgba.g, rgba.b, rgba.a]).toStrictEqual([170, 187, 204, 221]);
    });

    test("long hex", () => {
        const rgb = new Color("#12ABef");
        const rgba = new Color("#12345678");

        expect([rgb.r, rgb.g, rgb.b, rgb.a]).toStrictEqual([18, 171, 239, 255]);
        expect([rgba.r, rgba.g, rgba.b, rgba.a]).toStrictEqual([18, 52, 86, 120]);
    });

    test("invalid hex", () => {
        expect(() => new Color("123456")).toThrow(InvalidHexColorError);
        expect(() => new Color("#xyz")).toThrow(InvalidHexColorError);
    });

    test("custom serialization", () => {
        const color = new Color(1, 2, 16, 128);
        const solid = new Color(1, 2, 16);

        expect(Color.CUSTOM_SER.RGB(color)).toStrictEqual([1, 2, 16]);
        expect(Color.CUSTOM_SER.RGBA(color)).toStrictEqual([1, 2, 16, 128]);
        expect(Color.CUSTOM_SER.HEX(color)).toStrictEqual("#01021080");
        expect(Color.CUSTOM_SER.HEX(solid)).toStrictEqual("#010210");
    });
});

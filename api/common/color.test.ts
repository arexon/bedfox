import { assertEquals, assertThrows } from "@std/assert";
import {
    Color,
    InvalidColorChannelError,
    InvalidHexColorError,
} from "./color.ts";

Deno.test("Color", async (ctx) => {
    await ctx.step("RGB defaults alpha to 255", () => {
        const color = new Color(12, 34, 56);
        assertEquals([color.r, color.g, color.b, color.a], [12, 34, 56, 255]);
    });

    await ctx.step("RGBA rounds channels to u8", () => {
        const color = new Color(12.4, 127.5, 254.6, 4.4);
        assertEquals([color.r, color.g, color.b, color.a], [12, 128, 255, 4]);
    });

    await ctx.step("invalid channels", () => {
        assertThrows(() => new Color(-1, 0, 0), InvalidColorChannelError);
        assertThrows(() => new Color(0, 0, 256), InvalidColorChannelError);
        assertThrows(
            () => new Color(0, 0, Number.NaN),
            InvalidColorChannelError,
        );
    });

    await ctx.step("short hex", () => {
        const rgb = new Color("#abc");
        const rgba = new Color("#abcd");

        assertEquals([rgb.r, rgb.g, rgb.b, rgb.a], [170, 187, 204, 255]);
        assertEquals([rgba.r, rgba.g, rgba.b, rgba.a], [170, 187, 204, 221]);
    });

    await ctx.step("long hex", () => {
        const rgb = new Color("#12ABef");
        const rgba = new Color("#12345678");

        assertEquals([rgb.r, rgb.g, rgb.b, rgb.a], [18, 171, 239, 255]);
        assertEquals([rgba.r, rgba.g, rgba.b, rgba.a], [18, 52, 86, 120]);
    });

    await ctx.step("invalid hex", () => {
        assertThrows(() => new Color("123456"), InvalidHexColorError);
        assertThrows(() => new Color("#xyz"), InvalidHexColorError);
    });

    await ctx.step("custom serialization", () => {
        const color = new Color(1, 2, 16, 128);
        const solid = new Color(1, 2, 16);

        assertEquals(Color.CUSTOM_SER.RGB(color), [1, 2, 16]);
        assertEquals(Color.CUSTOM_SER.RGBA(color), [1, 2, 16, 128]);
        assertEquals(Color.CUSTOM_SER.HEX(color), "#01021080");
        assertEquals(Color.CUSTOM_SER.HEX(solid), "#010210");
    });
});

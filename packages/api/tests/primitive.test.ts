import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
    Color,
    FormatVersion,
    InvalidColorChannelError,
    InvalidHexColorError,
    Range,
    Vec3,
} from "#/primitive/index";

describe(Color.name, () => {
    test("RGBA rounds channels to u8", () => {
        const color = new Color(12.4, 127.5, 254.6, 4.4);
        assert.deepStrictEqual([color.r, color.g, color.b, color.a], [12, 128, 255, 4]);
    });

    test("invalid channels", () => {
        assert.throws(() => new Color(-1, 0, 0), InvalidColorChannelError);
        assert.throws(() => new Color(0, 0, 256), InvalidColorChannelError);
        assert.throws(() => new Color(0, 0, Number.NaN), InvalidColorChannelError);
    });

    test("invalid hex", () => {
        assert.throws(() => new Color("123456"), InvalidHexColorError);
        assert.throws(() => new Color("#xyz"), InvalidHexColorError);
    });

    test("direct rgb", () => {
        assert.equal(JSON.stringify(new Color(10, 20, 30)), '"#0a141e"');
    });

    for (const [label, color, rgb, rgba, hex] of [
        ["rgb", new Color(255, 128, 0), [255, 128, 0], [255, 128, 0, 255], "#ff8000"],
        ["rgba", new Color(255, 128, 0, 64), [255, 128, 0], [255, 128, 0, 64], "#ff800040"],
        ["hex3", new Color("#f80"), [255, 136, 0], [255, 136, 0, 255], "#ff8800"],
        ["hex4", new Color("#f808"), [255, 136, 0], [255, 136, 0, 136], "#ff880088"],
        ["hex6", new Color("#FF8000"), [255, 128, 0], [255, 128, 0, 255], "#ff8000"],
        ["hex8", new Color("#ff800040"), [255, 128, 0], [255, 128, 0, 64], "#ff800040"],
    ] as const) {
        test(`converts ${label}`, () => {
            assert.deepStrictEqual(color.toRgb(), rgb);
            assert.deepStrictEqual(color.toRgba(), rgba);
            assert.equal(color.toHex(), hex);
        });
    }
});

describe(Vec3.name, () => {
    test("direct", () => {
        assert.equal(JSON.stringify(new Vec3(1, 2.5, -3)), "[1,2.5,-3]");
    });
});

describe(Range.name, () => {
    test("direct", () => {
        assert.equal(JSON.stringify(new Range(2, 9)), "[2,9]");
    });

    test("from", () => {
        assert.equal(JSON.stringify(Range.from(4)), "[0,3]");
    });

    test("values object", () => {
        assert.equal(
            JSON.stringify(new Range(2, 9).toValuesObject()),
            '{"values":{"min":2,"max":9}}',
        );
    });
});

describe(FormatVersion.name, () => {
    test("direct", () => {
        assert.equal(JSON.stringify(new FormatVersion(1, 21, 0)), '"1.21.0"');
    });
});

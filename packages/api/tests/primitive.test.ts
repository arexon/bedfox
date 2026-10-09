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

describe("Color", () => {
    test("RGB defaults alpha to 255", () => {
        const color = new Color(12, 34, 56);
        assert.deepStrictEqual([color.r, color.g, color.b, color.a], [12, 34, 56, 255]);
    });

    test("RGBA rounds channels to u8", () => {
        const color = new Color(12.4, 127.5, 254.6, 4.4);
        assert.deepStrictEqual([color.r, color.g, color.b, color.a], [12, 128, 255, 4]);
    });

    test("invalid channels", () => {
        assert.throws(() => new Color(-1, 0, 0), InvalidColorChannelError);
        assert.throws(() => new Color(0, 0, 256), InvalidColorChannelError);
        assert.throws(() => new Color(0, 0, Number.NaN), InvalidColorChannelError);
    });

    test("short hex", () => {
        const rgb = new Color("#abc");
        const rgba = new Color("#abcd");

        assert.deepStrictEqual([rgb.r, rgb.g, rgb.b, rgb.a], [170, 187, 204, 255]);
        assert.deepStrictEqual([rgba.r, rgba.g, rgba.b, rgba.a], [170, 187, 204, 221]);
    });

    test("long hex", () => {
        const rgb = new Color("#12ABef");
        const rgba = new Color("#12345678");

        assert.deepStrictEqual([rgb.r, rgb.g, rgb.b, rgb.a], [18, 171, 239, 255]);
        assert.deepStrictEqual([rgba.r, rgba.g, rgba.b, rgba.a], [18, 52, 86, 120]);
    });

    test("invalid hex", () => {
        assert.throws(() => new Color("123456"), InvalidHexColorError);
        assert.throws(() => new Color("#xyz"), InvalidHexColorError);
    });

    test("direct rgb", () => {
        assert.equal(JSON.stringify(new Color(10, 20, 30)), '"#0a141e"');
    });

    test("direct rgba", () => {
        assert.equal(JSON.stringify(new Color(10, 20, 30, 40)), '"#0a141e28"');
    });

    test("direct hex", () => {
        assert.equal(JSON.stringify(new Color("#abc")), '"#aabbcc"');
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

describe("Vec3", () => {
    test("direct", () => {
        assert.equal(JSON.stringify(new Vec3(1, 2.5, -3)), "[1,2.5,-3]");
    });

    test("tuple", () => {
        assert.equal(JSON.stringify(new Vec3(1, 2.5, -3).toTuple()), "[1,2.5,-3]");
    });
});

describe("Range", () => {
    test("direct", () => {
        assert.equal(JSON.stringify(new Range(2, 9)), "[2,9]");
    });

    test("from", () => {
        assert.equal(JSON.stringify(Range.from(4)), "[0,3]");
    });

    test("tuple", () => {
        assert.equal(JSON.stringify(new Range(2, 9).toTuple()), "[2,9]");
    });

    test("object", () => {
        assert.equal(JSON.stringify(new Range(2, 9).toObject()), '{"min":2,"max":9}');
    });

    test("values object", () => {
        assert.equal(
            JSON.stringify(new Range(2, 9).toValuesObject()),
            '{"values":{"min":2,"max":9}}',
        );
    });
});

describe("FormatVersion", () => {
    test("direct", () => {
        assert.equal(JSON.stringify(new FormatVersion(1, 21, 0)), '"1.21.0"');
    });

    test("in object", () => {
        assert.equal(JSON.stringify({ v: new FormatVersion(1, 26, 40) }), '{"v":"1.26.40"}');
    });
});

describe("BlockDescriptor", () => {
    test("full", () => {
        const descriptor = {
            name: "minecraft:log",
            tags: "q.any_tag('wood')",
            states: { pillar_axis: "y", age: 3, open_bit: true },
        };
        assert.equal(
            JSON.stringify(descriptor),
            `{"name":"minecraft:log","tags":"q.any_tag('wood')","states":{"pillar_axis":"y","age":3,"open_bit":true}}`,
        );
    });

    test("minimal", () => {
        assert.equal(JSON.stringify({ name: "minecraft:stone" }), '{"name":"minecraft:stone"}');
    });

    test("empty states", () => {
        assert.equal(
            JSON.stringify({ name: "minecraft:stone", states: {} }),
            '{"name":"minecraft:stone","states":{}}',
        );
    });
});

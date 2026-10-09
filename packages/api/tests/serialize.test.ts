import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Block, BlockTrait } from "#/block/index";
import {
    Component,
    DecoratedNonFieldError,
    Definition,
    MultipleTransparentFieldsError,
    NestedTransparentFieldError,
    serialize,
    toReference,
    UnsupportedJsonValueError,
} from "#/core/index";
import { Feature, ScatterFeature } from "#/feature/index";
import { FormatVersion } from "#/primitive/index";

@serialize
class Shared {
    itemName?: string;
    destroySpeed?: number;
    nested?: Record<string, unknown>;
    list?: unknown[];
}

describe("@serialize defaults", () => {
    describe("values", () => {
        test("primitives and null pass through", () => {
            const row = Object.assign(new Shared(), { list: [null, "a", false, 0] });
            assert.equal(JSON.stringify(row), '{"list":[null,"a",false,0]}');
        });

        test("referenceable values serialize as their reference when nested", () => {
            const def = {
                [toReference]: () => "my:feature",
                toJSON: () => ({ full: true }),
            };
            const row = Object.assign(new Shared(), { list: [def, [def, 3]] });
            assert.equal(JSON.stringify(row), '{"list":["my:feature",["my:feature",3]]}');
        });

        test("toJSON results are never re-cased", () => {
            class Override {
                boneVisibility = { leftArm: true };
                toJSON(): unknown {
                    return { bone_visibility: this.boneVisibility };
                }
            }
            const row = Object.assign(new Shared(), { list: [new Override()] });
            assert.equal(JSON.stringify(row), '{"list":[{"bone_visibility":{"leftArm":true}}]}');
        });

        test("functions inside plain objects are skipped", () => {
            const row = Object.assign(new Shared(), { nested: { a: 1, f: () => 1 } });
            assert.equal(JSON.stringify(row), '{"nested":{"a":1}}');
        });
    });

    describe("class instances", () => {
        describe("fields", () => {
            test("own fields become snake_case keys", () => {
                const row = Object.assign(new Shared(), { itemName: "x", destroySpeed: 2 });
                assert.equal(JSON.stringify(row), '{"item_name":"x","destroy_speed":2}');
            });

            test("inherited fields are included", () => {
                class Child extends Shared {
                    extraField = 1;
                }
                const child = Object.assign(new Child(), { itemName: "x" });
                assert.equal(JSON.stringify(child), '{"item_name":"x","extra_field":1}');
            });

            test("getters, methods, symbols and #private fields are skipped", () => {
                const sym: unique symbol = Symbol("sym");
                @serialize
                class Hidden {
                    #secret = 1;
                    [sym] = 2;
                    shown = 3;
                    get computed(): number {
                        return this.#secret;
                    }
                    method(): void {}
                }
                assert.equal(JSON.stringify(new Hidden()), '{"shown":3}');
            });

            test("casing applies to plain objects inside a field", () => {
                const row = Object.assign(new Shared(), {
                    list: [{ destroySpeed: 2, "minecraft:axis": "y" }],
                });
                assert.equal(
                    JSON.stringify(row),
                    '{"list":[{"destroy_speed":2,"minecraft:axis":"y"}]}',
                );
            });
        });

        describe("empty values", () => {
            test("undefined, empty arrays and empty objects are omitted", () => {
                const row = Object.assign(new Shared(), {
                    itemName: undefined,
                    nested: {},
                    list: [],
                });
                assert.equal(JSON.stringify(row), "{}");
            });

            test("empties inside records and arrays are kept", () => {
                const row = Object.assign(new Shared(), { nested: { marker: {} }, list: [[], {}] });
                assert.equal(JSON.stringify(row), '{"nested":{"marker":{}},"list":[[],{}]}');
            });
        });

        describe("nesting", () => {
            test("nested instances serialize their own fields", () => {
                const inner = Object.assign(new Shared(), { itemName: "inner" });
                const row = Object.assign(new Shared(), { list: [inner] });
                assert.equal(JSON.stringify(row), '{"list":[{"item_name":"inner"}]}');
            });

            test("the same instance twice is fine", () => {
                const inner = Object.assign(new Shared(), { itemName: "x" });
                const row = Object.assign(new Shared(), { list: [inner, inner] });
                assert.equal(JSON.stringify(row), '{"list":[{"item_name":"x"},{"item_name":"x"}]}');
            });
        });
    });

    describe("unsupported values", () => {
        const unsupported: [string, unknown][] = [
            ["Map", new Map([["a", 1]])],
            ["Set", new Set([1])],
        ];
        for (const [name, value] of unsupported) {
            test(`a ${name} throws`, () => {
                const row = Object.assign(new Shared(), { nested: { value } });
                assert.throws(() => JSON.stringify(row), {
                    name: "UnsupportedJsonValueError",
                    message: `${name} can't be serialized to JSON`,
                });
            });
        }

        test("UnsupportedJsonValueError is a TypeError", () => {
            assert.ok(new UnsupportedJsonValueError("Map") instanceof TypeError);
        });
    });
});

describe("@serialize with options", () => {
    describe("on fields", () => {
        describe("within", () => {
            test("nests fields, placing each group at its first set member", () => {
                @serialize
                class Grouped {
                    first = 1;
                    @serialize({ within: "group" }) a?: number;
                    @serialize({ within: ["group", "inner"] }) b?: number;
                    last = 2;
                }
                const grouped = Object.assign(new Grouped(), { a: 3, b: 4 });
                assert.equal(
                    JSON.stringify(grouped),
                    '{"first":1,"group":{"a":3,"inner":{"b":4}},"last":2}',
                );
            });

            test("groups with no set members are omitted", () => {
                @serialize
                class Grouped {
                    @serialize({ within: "group" }) a?: number;
                    @serialize({ within: "group" }) b: number[] = [];
                }
                assert.equal(JSON.stringify(new Grouped()), "{}");
            });
        });

        describe("rename", () => {
            test("replaces the snake_cased key", () => {
                @serialize
                class Renamed {
                    @serialize({ rename: "minecraft:biome_filter" }) biomeFilter = "x";
                    @serialize({ rename: "early_out_scheme" }) earlyOut = "none";
                }
                assert.equal(
                    JSON.stringify(new Renamed()),
                    '{"minecraft:biome_filter":"x","early_out_scheme":"none"}',
                );
            });
        });

        describe("keepKeys", () => {
            test("keeps a record's own keys, but not its values' keys", () => {
                @serialize
                class Keyed {
                    @serialize({ keepKeys: true }) byName?: Record<string, unknown>;
                    other = { camelKey: 1 };
                }
                const keyed = Object.assign(new Keyed(), {
                    byName: { leftArm: { renderMethod: "blend" } },
                });
                assert.equal(
                    JSON.stringify(keyed),
                    '{"by_name":{"leftArm":{"render_method":"blend"}},"other":{"camel_key":1}}',
                );
            });

            test("an empty record is omitted", () => {
                @serialize
                class Keyed {
                    @serialize({ keepKeys: true }) byName = {};
                }
                assert.equal(JSON.stringify(new Keyed()), "{}");
            });
        });

        describe("override", () => {
            test("is called for unset fields, and its result is serialized but kept when empty", () => {
                const seen: unknown[] = [];
                @serialize
                class Overridden {
                    @serialize({
                        override: (value?: boolean) => {
                            seen.push(value);
                            return value === true ? {} : undefined;
                        },
                    })
                    flag?: boolean;
                    @serialize({ override: () => ({ camelKey: [] }) })
                    raw?: string;
                }
                assert.equal(JSON.stringify(new Overridden()), '{"raw":{"camel_key":[]}}');
                assert.equal(
                    JSON.stringify(Object.assign(new Overridden(), { flag: true })),
                    '{"flag":{},"raw":{"camel_key":[]}}',
                );
                assert.deepStrictEqual(seen, [undefined, true]);
            });
        });

        describe("transparent", () => {
            @serialize
            class Light extends Component.of("minecraft:light") {
                @serialize({ transparent: true }) level?: number;
                color?: string;
            }

            test("collapses to the field when it's the only one set", () => {
                assert.equal(JSON.stringify(Object.assign(new Light(), { level: 4 })), "4");
            });

            test("stays an object when other fields are set", () => {
                const light = Object.assign(new Light(), { level: 4, color: "red" });
                assert.equal(JSON.stringify(light), '{"level":4,"color":"red"}');
            });

            test("a renamed field still collapses", () => {
                @serialize
                class Renamed extends Component.of("minecraft:renamed") {
                    @serialize({ transparent: true, rename: "lvl" }) level = 1;
                }
                assert.equal(JSON.stringify(new Renamed()), "1");
            });

            describe("misuse", () => {
                test("a second transparent field throws when serialized", () => {
                    @serialize
                    class Twice {
                        @serialize({ transparent: true }) a?: number;
                        @serialize({ transparent: true }) b?: number;
                    }
                    assert.throws(
                        () => JSON.stringify(new Twice()),
                        MultipleTransparentFieldsError,
                    );
                });

                test("transparent with within throws when serialized", () => {
                    @serialize
                    class Nested {
                        @serialize({ transparent: true, within: "group" }) a?: number;
                    }
                    assert.throws(() => JSON.stringify(new Nested()), NestedTransparentFieldError);
                });

                test("inherited conflicts throw when serialized", () => {
                    @serialize
                    class Base extends Component.of("test:base") {
                        @serialize({ transparent: true }) a?: number;
                    }
                    class Twice extends Base {
                        @serialize({ transparent: true }) b?: number;
                    }
                    class Nested extends Base {
                        @serialize({ within: "group" }) override a?: number = 1;
                    }
                    assert.throws(
                        () => JSON.stringify(new Twice()),
                        MultipleTransparentFieldsError,
                    );
                    assert.throws(() => JSON.stringify(new Nested()), NestedTransparentFieldError);
                });
            });
        });

        describe("inheritance", () => {
            test("subclasses inherit decorated fields and can add their own", () => {
                @serialize
                class Base {
                    @serialize({ within: "group" }) a = 1;
                }
                class Sub extends Base {
                    @serialize({ within: "group" }) b = 2;
                    @serialize({ rename: "c_key" }) c = 3;
                }
                assert.equal(JSON.stringify(new Sub()), '{"group":{"a":1,"b":2},"c_key":3}');
                assert.equal(JSON.stringify(new Base()), '{"group":{"a":1}}');
            });
        });

        describe("key collisions", () => {
            test("within paths that collide with other keys throw", () => {
                @serialize
                class GroupThenField {
                    @serialize({ within: "distribution" }) x = 1;
                    distribution = { a: 1 };
                }
                @serialize
                class FieldThenGroup {
                    distribution = "abc";
                    @serialize({ within: "distribution" }) x = 1;
                }
                @serialize
                class Renamed {
                    a = 1;
                    @serialize({ rename: "a" }) b = 2;
                }
                for (const Ctor of [GroupThenField, FieldThenGroup, Renamed]) {
                    assert.throws(() => JSON.stringify(new Ctor()), {
                        name: "DuplicateJsonKeyError",
                    });
                }
            });

            test("an override field collides with a within group of the same key", () => {
                @serialize
                class Overridden {
                    @serialize({ override: () => ({}) }) a?: number;
                    @serialize({ within: "a", rename: "b_key" }) b = 2;
                }
                assert.throws(() => JSON.stringify(new Overridden()), {
                    name: "DuplicateJsonKeyError",
                });
            });
        });

        describe("misuse", () => {
            test("decorating a static field throws", () => {
                assert.throws(() => {
                    class _Static {
                        @serialize({ rename: "x" }) static x = 1;
                        y = 2;
                    }
                }, DecoratedNonFieldError);
            });

            test("decorating a method or accessor throws", () => {
                assert.throws(() => {
                    class _Method {
                        @serialize({ rename: "x" }) method(): void {}
                    }
                }, DecoratedNonFieldError);
                assert.throws(() => {
                    class _Accessor {
                        @serialize({ rename: "x" }) get accessor(): number {
                            return 1;
                        }
                    }
                }, DecoratedNonFieldError);
            });
        });
    });

    describe("on classes", () => {
        test("gives the class a toJSON() that serializes its fields", () => {
            @serialize
            class Plain {
                itemName = "x";
                @serialize({ rename: "other_key" }) other = 1;
            }
            assert.equal(JSON.stringify(new Plain()), '{"item_name":"x","other_key":1}');
        });

        test("subclasses inherit its toJSON, or can repeat @serialize", () => {
            class Inherited extends Block {}
            @serialize
            class Repeated extends Block {}
            const expected =
                '{"format_version":"1.26.40","minecraft:block":{"description":{"identifier":"t:b"}}}';
            assert.equal(JSON.stringify(new Inherited("t:b")), expected);
            assert.equal(JSON.stringify(new Repeated("t:b")), expected);
        });
    });
});

describe("of() bases", () => {
    describe("Component.of", () => {
        test("sets the componentId", () => {
            @serialize
            class Light extends Component.of("minecraft:light") {}
            assert.equal(Light.componentId, "minecraft:light");
            assert.equal(new Light().componentId, "minecraft:light");
        });

        test("each call makes a distinct base", () => {
            assert.notEqual(Component.of("a:a"), Component.of("a:a"));
        });

        test("custom components are snake_cased like built-in ones", () => {
            @serialize
            class Spin extends Component.of("custom:spin") {
                @serialize({ transparent: true }) spinSpeed = 2;
                axisWeights?: Record<string, number>;
            }
            const spin = Object.assign(new Spin(), { axisWeights: { upAxis: 1 } });
            assert.equal(JSON.stringify(spin), '{"spin_speed":2,"axis_weights":{"up_axis":1}}');
            assert.equal(JSON.stringify(new Spin()), "2");
        });
    });

    describe("BlockTrait.of", () => {
        test("sets the traitId", () => {
            @serialize
            class Trait extends BlockTrait.of("test:trait") {}
            assert.equal(new Trait().traitId, "test:trait");
        });
    });

    describe("Definition.of", () => {
        @serialize
        class Thing extends Definition.of("test:thing", new FormatVersion(1, 2, 3)) {
            identifier = "test:thing";
            note?: string;
            @serialize({ within: "description" }) label?: string;
        }

        describe("file layout", () => {
            test("serializes as a definition file", () => {
                assert.equal(
                    JSON.stringify(new Thing()),
                    '{"format_version":"1.2.3","test:thing":{"description":{"identifier":"test:thing"}}}',
                );
            });

            test("description comes first, with the identifier first inside it", () => {
                const thing = Object.assign(new Thing(), { note: "n", label: "l" });
                assert.equal(
                    JSON.stringify(thing),
                    '{"format_version":"1.2.3","test:thing":{"description":{"identifier":"test:thing","label":"l"},"note":"n"}}',
                );
            });

            test("an explicit format version wins over the fallback", () => {
                const thing = Object.assign(new Thing(), {
                    formatVersion: new FormatVersion(1, 0, 0),
                });
                assert.equal(
                    JSON.stringify(thing),
                    '{"format_version":"1.0.0","test:thing":{"description":{"identifier":"test:thing"}}}',
                );
            });
        });

        describe("subclasses", () => {
            test("Feature.of() makes Feature subclasses", () => {
                const scatter = new ScatterFeature("test:scatter", {
                    placesFeature: "test:feature",
                });
                assert.ok(scatter instanceof Feature);
                assert.equal(
                    JSON.stringify(scatter),
                    '{"format_version":"1.26.50","minecraft:scatter_feature":{"description":{"identifier":"test:scatter"},"places_feature":"test:feature"}}',
                );
            });

            test("subclasses of built-in definitions inherit their root", () => {
                class MyBlock extends Block {}
                assert.equal(
                    JSON.stringify(new MyBlock("test:block")),
                    '{"format_version":"1.26.40","minecraft:block":{"description":{"identifier":"test:block"}}}',
                );
            });
        });
    });
});

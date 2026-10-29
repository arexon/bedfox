import { describe, expect, test } from "vite-plus/test";

import { Block } from "#/block/index";
import { Component } from "#/core/component";
import { Definition, type DefinitionLocation, InvalidIdentifierError } from "#/core/definition";
import { Feature } from "#/feature/base";
import { OreFeature } from "#/feature/ore";
import { FeatureRules } from "#/feature/rules";
import { ScatterFeature } from "#/feature/scatter";
import { FormatVersion } from "#/primitive/index";
import {
    DecoratedNonFieldError,
    MultipleTransparentFieldsError,
    NestedTransparentFieldError,
    serialize,
    TO_REFERENCE,
} from "#/serialize";

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
            expect(JSON.stringify(row)).toBe('{"list":[null,"a",false,0]}');
        });

        test("referenceable values serialize as their reference when nested", () => {
            const def = {
                [TO_REFERENCE]: () => "my:feature",
                toJSON: () => ({ full: true }),
            };
            const row = Object.assign(new Shared(), { list: [def, [def, 3]] });
            expect(JSON.stringify(row)).toBe('{"list":["my:feature",["my:feature",3]]}');
        });

        test("toJSON() results are never re-cased", () => {
            class Override {
                boneVisibility = { leftArm: true };
                toJSON(): unknown {
                    return { bone_visibility: this.boneVisibility };
                }
            }
            const row = Object.assign(new Shared(), { list: [new Override()] });
            expect(JSON.stringify(row)).toBe('{"list":[{"bone_visibility":{"leftArm":true}}]}');
        });

        test("functions inside plain objects are skipped", () => {
            const row = Object.assign(new Shared(), { nested: { a: 1, f: () => 1 } });
            expect(JSON.stringify(row)).toBe('{"nested":{"a":1}}');
        });
    });

    describe("class instances", () => {
        describe("fields", () => {
            test("own fields become snake_case keys", () => {
                const row = Object.assign(new Shared(), { itemName: "x", destroySpeed: 2 });
                expect(JSON.stringify(row)).toBe('{"item_name":"x","destroy_speed":2}');
            });

            test("inherited fields are included", () => {
                class Child extends Shared {
                    extraField = 1;
                }
                const child = Object.assign(new Child(), { itemName: "x" });
                expect(JSON.stringify(child)).toBe('{"item_name":"x","extra_field":1}');
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
                expect(JSON.stringify(new Hidden())).toBe('{"shown":3}');
            });

            test("casing applies to plain objects inside a field", () => {
                const row = Object.assign(new Shared(), {
                    list: [{ destroySpeed: 2, "minecraft:axis": "y" }],
                });
                expect(JSON.stringify(row)).toBe(
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
                expect(JSON.stringify(row)).toBe("{}");
            });

            test("empties inside records and arrays are kept", () => {
                const row = Object.assign(new Shared(), { nested: { marker: {} }, list: [[], {}] });
                expect(JSON.stringify(row)).toBe('{"nested":{"marker":{}},"list":[[],{}]}');
            });
        });

        describe("nesting", () => {
            test("nested instances serialize their own fields", () => {
                const inner = Object.assign(new Shared(), { itemName: "inner" });
                const row = Object.assign(new Shared(), { list: [inner] });
                expect(JSON.stringify(row)).toBe('{"list":[{"item_name":"inner"}]}');
            });

            test("the same instance twice is fine", () => {
                const inner = Object.assign(new Shared(), { itemName: "x" });
                const row = Object.assign(new Shared(), { list: [inner, inner] });
                expect(JSON.stringify(row)).toBe('{"list":[{"item_name":"x"},{"item_name":"x"}]}');
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
                expect(() => JSON.stringify(row)).toThrow(
                    expect.objectContaining({
                        name: "UnsupportedJsonValueError",
                        message: `${name} can't be serialized to JSON`,
                    }),
                );
            });
        }
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
                expect(JSON.stringify(grouped)).toBe(
                    '{"first":1,"group":{"a":3,"inner":{"b":4}},"last":2}',
                );
            });

            test("groups with no set members are omitted", () => {
                @serialize
                class Grouped {
                    @serialize({ within: "group" }) a?: number;
                    @serialize({ within: "group" }) b: number[] = [];
                }
                expect(JSON.stringify(new Grouped())).toBe("{}");
            });
        });

        describe("rename", () => {
            test("replaces the snake_cased key", () => {
                @serialize
                class Renamed {
                    @serialize({ rename: "minecraft:biome_filter" }) biomeFilter = "x";
                    @serialize({ rename: "early_out_scheme" }) earlyOut = "none";
                }
                expect(JSON.stringify(new Renamed())).toBe(
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
                expect(JSON.stringify(keyed)).toBe(
                    '{"by_name":{"leftArm":{"render_method":"blend"}},"other":{"camel_key":1}}',
                );
            });
        });

        describe("override", () => {
            test("receives the instance", () => {
                @serialize
                class Pair {
                    left = 1;
                    @serialize({ override: (_, pair: Pair) => pair.left + 1 })
                    right = 0;
                }
                expect(JSON.stringify(new Pair())).toBe('{"left":1,"right":2}');
            });

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
                expect(JSON.stringify(new Overridden())).toBe('{"raw":{"camel_key":[]}}');
                expect(JSON.stringify(Object.assign(new Overridden(), { flag: true }))).toBe(
                    '{"flag":{},"raw":{"camel_key":[]}}',
                );
                expect(seen).toStrictEqual([undefined, true]);
            });
        });

        describe("transparent", () => {
            @serialize
            class Light extends Component {
                @serialize({ transparent: true }) level?: number;
                color?: string;
            }

            test("collapses to the field when it's the only one set", () => {
                expect(JSON.stringify(Object.assign(new Light(), { level: 4 }))).toBe("4");
            });

            test("stays an object when other fields are set", () => {
                const light = Object.assign(new Light(), { level: 4, color: "red" });
                expect(JSON.stringify(light)).toBe('{"level":4,"color":"red"}');
            });

            test("a renamed field still collapses", () => {
                @serialize
                class Renamed extends Component {
                    @serialize({ transparent: true, rename: "lvl" }) level = 1;
                }
                expect(JSON.stringify(new Renamed())).toBe("1");
            });

            describe("misuse", () => {
                test("a second transparent field throws when serialized", () => {
                    @serialize
                    class Twice {
                        @serialize({ transparent: true }) a?: number;
                        @serialize({ transparent: true }) b?: number;
                    }
                    expect(() => JSON.stringify(new Twice())).toThrow(
                        MultipleTransparentFieldsError,
                    );
                });

                test("transparent with within throws when serialized", () => {
                    @serialize
                    class Nested {
                        @serialize({ transparent: true, within: "group" }) a?: number;
                    }
                    expect(() => JSON.stringify(new Nested())).toThrow(NestedTransparentFieldError);
                });

                test("inherited conflicts throw when serialized", () => {
                    @serialize
                    class Base extends Component {
                        @serialize({ transparent: true }) a?: number;
                    }
                    class Twice extends Base {
                        @serialize({ transparent: true }) b?: number;
                    }
                    class Nested extends Base {
                        @serialize({ within: "group" }) override a?: number = 1;
                    }
                    expect(() => JSON.stringify(new Twice())).toThrow(
                        MultipleTransparentFieldsError,
                    );
                    expect(() => JSON.stringify(new Nested())).toThrow(NestedTransparentFieldError);
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
                expect(JSON.stringify(new Sub())).toBe('{"group":{"a":1,"b":2},"c_key":3}');
                expect(JSON.stringify(new Base())).toBe('{"group":{"a":1}}');
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
                    expect(() => JSON.stringify(new Ctor())).toThrow(
                        expect.objectContaining({
                            name: "DuplicateJsonKeyError",
                        }),
                    );
                }
            });

            test("an override field collides with a within group of the same key", () => {
                @serialize
                class Overridden {
                    @serialize({ override: () => ({}) }) a?: number;
                    @serialize({ within: "a", rename: "b_key" }) b = 2;
                }
                expect(() => JSON.stringify(new Overridden())).toThrow(
                    expect.objectContaining({
                        name: "DuplicateJsonKeyError",
                    }),
                );
            });
        });

        describe("misuse", () => {
            test("decorating a static field throws", () => {
                expect(() => {
                    class _Static {
                        @serialize({ rename: "x" }) static x = 1;
                        y = 2;
                    }
                }).toThrow(DecoratedNonFieldError);
            });

            test("decorating a method or accessor throws", () => {
                expect(() => {
                    class _Method {
                        @serialize({ rename: "x" }) method(): void {}
                    }
                }).toThrow(DecoratedNonFieldError);
                expect(() => {
                    class _Accessor {
                        @serialize({ rename: "x" }) get accessor(): number {
                            return 1;
                        }
                    }
                }).toThrow(DecoratedNonFieldError);
            });
        });
    });

    describe("on classes", () => {
        test("subclasses inherit its toJSON(), or can repeat @serialize", () => {
            class Inherited extends Block {}
            @serialize
            class Repeated extends Block {}
            const expected =
                '{"format_version":"1.26.40","minecraft:block":{"description":{"identifier":"b"}}}';
            expect(JSON.stringify(new Inherited("b"))).toBe(expected);
            expect(JSON.stringify(new Repeated("b"))).toBe(expected);
        });
    });
});

describe("definitions", () => {
    @serialize
    class Thing extends Definition {
        static override readonly defaultFormatVersion = new FormatVersion(1, 2, 3);
        static override readonly location: DefinitionLocation = {
            kind: "behavior",
            folder: "things",
        };

        @serialize({ within: ["test:thing", "description"] })
        override readonly identifier: string;

        @serialize({ within: "test:thing" })
        note?: string;

        @serialize({ within: ["test:thing", "description"] })
        label?: string;

        constructor(identifier: string) {
            super(identifier);
            this.identifier = identifier;
        }
    }

    test("reject identifiers that can't name a file", () => {
        for (const id of ["test:dirt", "../dirt", "Dirt", ""]) {
            expect(() => new Block(id), id).toThrow(InvalidIdentifierError);
        }
    });

    describe("location", () => {
        test("puts each kind in its folder", () => {
            const outputs = [
                new Block("dirt"),
                new OreFeature("ore"),
                new FeatureRules("rules", { placesFeature: "test:ore" }),
            ].map((def) => `${def.kind}/${def.path}`);
            expect(outputs).toStrictEqual([
                "behavior/blocks/dirt.json",
                "behavior/features/ore.json",
                "behavior/feature_rules/rules.json",
            ]);
        });
    });

    describe("file layout", () => {
        test("serializes as a definition file", () => {
            expect(JSON.stringify(new Thing("thing"))).toBe(
                '{"format_version":"1.2.3","test:thing":{"description":{"identifier":"thing"}}}',
            );
        });

        test("description comes first, with the identifier first inside it", () => {
            const thing = Object.assign(new Thing("thing"), { note: "n", label: "l" });
            expect(JSON.stringify(thing)).toBe(
                '{"format_version":"1.2.3","test:thing":{"description":{"identifier":"thing","label":"l"},"note":"n"}}',
            );
        });

        test("an explicit format version wins over the fallback", () => {
            const thing = Object.assign(new Thing("thing"), {
                formatVersion: new FormatVersion(1, 0, 0),
            });
            expect(JSON.stringify(thing)).toBe(
                '{"format_version":"1.0.0","test:thing":{"description":{"identifier":"thing"}}}',
            );
        });
    });

    describe("subclasses", () => {
        test("features are Feature subclasses", () => {
            const scatter = new ScatterFeature("scatter", {
                placesFeature: "test:feature",
            });
            expect(scatter).toBeInstanceOf(Feature);
            expect(JSON.stringify(scatter)).toBe(
                '{"format_version":"1.26.50","minecraft:scatter_feature":{"description":{"identifier":"scatter"},"places_feature":"test:feature"}}',
            );
        });
    });
});

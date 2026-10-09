import { describe, expect, test } from "vite-plus/test";

import { Ser } from "#/index";

/** Whether a field holding `value` is omitted for `default`. */
function omitted(value: unknown, defaultValue: unknown): boolean {
    @Ser()
    class Foo {
        @Ser({ default: () => defaultValue })
        x = value;
    }
    return JSON.stringify(new Foo()) === "{}";
}

describe("toJSON()", () => {
    test("empty", () => {
        @Ser()
        class Foo {}

        expect(JSON.stringify(new Foo())).toStrictEqual(`{}`);
    });

    test("basic", () => {
        @Ser()
        class Foo {
            @Ser()
            a = 8;

            @Ser()
            b = "foo";
        }

        expect(JSON.stringify(new Foo())).toStrictEqual(`{"a":8,"b":"foo"}`);
    });

    describe("special field names", () => {
        test("basic special chars", () => {
            @Ser()
            class Foo {
                @Ser()
                "*" = 0;

                @Ser()
                "$" = 0;

                @Ser()
                "10" = 0;

                @Ser()
                "a:bB" = 0;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{"10":0,"*":0,"$":0,"a:bB":0}`);
        });

        test("quote in field name", () => {
            @Ser()
            class Foo {
                @Ser()
                ['a"b'] = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{"a\\"b":1}`);
        });

        test("backslash in field name", () => {
            @Ser()
            class Foo {
                @Ser()
                ["a\\b"] = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{"a\\\\b":1}`);
        });

        test("newline in field name", () => {
            @Ser()
            class Foo {
                @Ser()
                ["a\nb"] = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{"a\\nb":1}`);
        });

        test("space not mangled by casing", () => {
            @Ser()
            class Foo {
                @Ser()
                ["foo bar"] = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{"foo bar":1}`);
        });

        test("leading underscore not stripped", () => {
            @Ser()
            class Foo {
                @Ser()
                _x = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{"_x":1}`);
        });

        test("quote in rename", () => {
            @Ser()
            class Foo {
                @Ser({ rename: 'a"b' })
                x = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{"a\\"b":1}`);
        });

        test("quote in path", () => {
            @Ser()
            class Foo {
                @Ser({ path: 'a"b' })
                x = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{"a\\"b":{"x":1}}`);
        });
    });

    test("symbol field", () => {
        expect(() => {
            const s = Symbol("s");
            @Ser()
            // oxlint-disable-next-line no-unused-vars
            class Foo {
                // @ts-expect-error Symbol keys are rejected by the types too.
                @Ser()
                [s] = 1;
            }
        }).toThrow("Symbol fields cannot be serialized");
    });

    describe("private fields access", () => {
        test("transparent", () => {
            expect(() => {
                @Ser({ transparent: "#x" })
                // oxlint-disable-next-line no-unused-vars
                class Foo {
                    // oxlint-disable-next-line no-unused-private-class-members
                    #x = 42;
                }
            }).toThrow("Cannot find a matching instance/getter field named '#x' in class 'Foo'");
        });
    });

    describe("inherit", () => {
        @Ser()
        class Parent {
            @Ser({ rename: "b" })
            a = "foo";
        }

        test("no method conflict", () => {
            class Child extends Parent {}

            expect(JSON.stringify(new Child())).toStrictEqual(`{"b":"foo"}`);
        });

        test("method conflict", () => {
            expect(() => {
                @Ser()
                // oxlint-disable-next-line no-unused-vars
                class Child extends Parent {}
            }).toThrow("Class 'Child' already has a toJSON() method defined");
        });
    });

    test("casing", () => {
        @Ser()
        class Foo {
            @Ser()
            fooBarBazQux = 1;
        }

        expect(JSON.stringify(new Foo())).toStrictEqual(`{"foo_bar_baz_qux":1}`);
    });

    test("casing edge cases", () => {
        @Ser()
        class Foo {
            @Ser()
            X = 0;
            @Ser()
            Ab = 0;
            @Ser()
            ABC = 0;
            @Ser()
            HTMLParser = 0;
            @Ser()
            parseHTML = 0;
            @Ser()
            getHTTPResponseCode = 0;
            @Ser()
            a1B = 0;
            @Ser()
            foo123bar = 0;
            @Ser()
            version2 = 0;
            @Ser()
            v2Beta = 0;
            @Ser()
            item3d = 0;
            @Ser()
            i18n = 0;
        }

        expect(Object.keys(JSON.parse(JSON.stringify(new Foo())))).toStrictEqual([
            "x",
            "ab",
            "abc",
            "html_parser",
            "parse_html",
            "get_http_response_code",
            "a_1_b",
            "foo_123_bar",
            "version_2",
            "v_2_beta",
            "item_3_d",
            "i_18_n",
        ]);
    });

    describe("rename", () => {
        test("basic", () => {
            @Ser()
            class Foo {
                @Ser({ rename: "no" })
                yes = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{"no":1}`);
        });
    });

    describe("defaults", () => {
        @Ser()
        class Bar {
            @Ser()
            a = 0;
        }

        @Ser()
        class Foo {
            @Ser()
            noDefault = 8;

            @Ser({ default: () => "foo" })
            primitive = "foo";

            @Ser({ default: () => ["foo", "bar"] })
            object = ["foo", "bar"];

            @Ser({ default: () => new Bar() })
            instance = new Bar();
        }

        const v = new Foo();
        test("all", () => {
            expect(JSON.stringify(v)).toStrictEqual(`{"no_default":8}`);
        });

        test("primitive", () => {
            v.primitive = "qux";
            expect(JSON.stringify(v)).toStrictEqual(`{"no_default":8,"primitive":"qux"}`);
        });

        test("object", () => {
            v.object.push("baz");
            expect(JSON.stringify(v)).toStrictEqual(
                `{"no_default":8,"primitive":"qux","object":["foo","bar","baz"]}`,
            );
        });

        test("instance", () => {
            v.instance.a = 10;
            expect(JSON.stringify(v)).toStrictEqual(
                `{"no_default":8,"primitive":"qux","object":["foo","bar","baz"],"instance":{"a":10}}`,
            );
        });
    });

    describe("default equality", () => {
        class P {
            constructor(public a = 1) {}
        }
        class Q {
            constructor(public a = 1) {}
        }

        class Bag {
            #items: number[];
            constructor(...items: number[]) {
                this.#items = items;
            }
            get size(): number {
                return this.#items.length;
            }
        }

        test.each<[string, unknown, unknown, boolean]>([
            ["same string", "a", "a", true],
            ["number vs string", 1, "1", false],
            ["NaN", NaN, NaN, true],
            ["equal arrays", [1, 2], [1, 2], true],
            ["array order", [1, 2], [2, 1], false],
            ["nested objects", { a: { b: [1] } }, { a: { b: [1] } }, true],
            ["key order", { a: 1, b: 2 }, { b: 2, a: 1 }, true],
            ["undefined property", { a: undefined }, {}, false],
            ["same class", new P(), new P(), true],
            ["class vs plain object", new P(), { a: 1 }, false],
            ["different classes", new P(), new Q(), false],
            ["maps", new Map([[1, { a: 1 }]]), new Map([[1, { a: 1 }]]), true],
            ["set order", new Set([1, 2]), new Set([2, 1]), true],
            ["dates", new Date(0), new Date(0), true],
            ["zero vs negative zero", 0, -0, false],
            // Only own enumerable properties are compared, so private state is
            // invisible. Use `custom` to omit such fields instead.
            ["private state, same", new Bag(1), new Bag(1), true],
            ["private state, different", new Bag(1, 2), new Bag(), true],
        ])("%s", (_, value, defaultValue, expected) => {
            expect(omitted(value, defaultValue)).toBe(expected);
        });
    });

    describe("custom override", () => {
        test("basic", () => {
            @Ser()
            class Foo {
                @Ser({
                    custom(): ["custom", string | string[]] {
                        return ["custom", this.a];
                    },
                })
                a: string | string[] = "foo";

                @Ser({
                    custom: (v) => ["custom", v],
                    default: () => "foo",
                })
                aDefaulted: string | string[] = "foo";
            }

            const v = new Foo();
            expect(JSON.stringify(v)).toStrictEqual(`{"a":["custom","foo"]}`);

            v.aDefaulted = "bar";
            expect(JSON.stringify(v)).toStrictEqual(
                `{"a":["custom","foo"],"a_defaulted":["custom","bar"]}`,
            );
        });

        test("skipped when default omits", () => {
            let calls = 0;
            @Ser()
            class Foo {
                @Ser({
                    custom: (v) => {
                        calls++;
                        return v;
                    },
                    default: () => 1,
                })
                x = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`{}`);
            expect(calls).toStrictEqual(0);

            const v = new Foo();
            v.x = 2;
            expect(JSON.stringify(v)).toStrictEqual(`{"x":2}`);
            expect(calls).toStrictEqual(1);
        });
    });

    test("default() called once per serialize", () => {
        let calls = 0;
        @Ser({ transparent: "t" })
        class Foo {
            @Ser()
            t = "x";

            @Ser({
                default: () => {
                    calls++;
                    return 0;
                },
            })
            d = 0;
        }

        expect(JSON.stringify(new Foo())).toStrictEqual(`"x"`);
        expect(calls).toStrictEqual(1);
    });

    describe("transparent", () => {
        describe("unknown field", () => {
            test("with other fields", () => {
                expect(() => {
                    @Ser({ transparent: "wrong" })
                    // oxlint-disable-next-line no-unused-vars
                    class Transparent {
                        @Ser()
                        a = "foo";
                    }
                }).toThrow(
                    "Cannot find a matching instance/getter field named 'wrong' in class 'Transparent'",
                );
            });

            test("with zero fields", () => {
                expect(() => {
                    @Ser({ transparent: "wrong" })
                    // oxlint-disable-next-line no-unused-vars
                    class Transparent {}
                }).toThrow(
                    "Cannot find a matching instance/getter field named 'wrong' in class 'Transparent'",
                );
            });
        });

        test("with default", () => {
            @Ser({ transparent: "basic" })
            class WithDefault {
                @Ser()
                basic = "foo";

                @Ser({ default: () => true })
                default = true;
            }

            const v = new WithDefault();
            expect(JSON.stringify(v)).toStrictEqual(`"foo"`);

            v.default = false;
            expect(JSON.stringify(v)).toStrictEqual(`{"basic":"foo","default":false}`);
        });

        test("on default", () => {
            @Ser({ transparent: "default" })
            class OnDefault {
                @Ser({ default: () => true })
                default = true;
            }

            const v = new OnDefault();
            expect(JSON.stringify(v)).toStrictEqual(`true`);

            v.default = false;
            expect(JSON.stringify(v)).toStrictEqual(`false`);
        });

        test("on custom + on default", () => {
            @Ser({ transparent: "custom" })
            class OnCustom {
                @Ser()
                basic? = "foo";

                @Ser({
                    custom: (v) => ["custom", v],
                    default: () => "foo",
                })
                custom: string | string[] = "bar";
            }

            const v = new OnCustom();
            expect(JSON.stringify(v)).toStrictEqual(`{"basic":"foo","custom":["custom","bar"]}`);

            v.custom = "foo";
            expect(JSON.stringify(v)).toStrictEqual(`{"basic":"foo"}`);

            v.basic = undefined;
            expect(JSON.stringify(v)).toStrictEqual(`["custom","foo"]`);
        });

        test("on getter", () => {
            @Ser({ transparent: "name" })
            class OnGetter {
                get name(): string {
                    return "foo";
                }
            }

            expect(JSON.stringify(new OnGetter())).toStrictEqual(`"foo"`);
        });

        describe("value evaluated once", () => {
            test("getter", () => {
                let calls = 0;
                @Ser({ transparent: "name" })
                class OnGetter {
                    get name(): string {
                        calls++;
                        return "foo";
                    }
                }

                expect(JSON.stringify(new OnGetter())).toStrictEqual(`"foo"`);
                expect(calls).toStrictEqual(1);
            });

            test("custom + default", () => {
                let calls = 0;
                @Ser({ transparent: "c" })
                class OnCustom {
                    @Ser({
                        custom: (v) => {
                            calls++;
                            return v;
                        },
                        default: () => 0,
                    })
                    c = 1;
                }

                expect(JSON.stringify(new OnCustom())).toStrictEqual(`1`);
                expect(calls).toStrictEqual(1);
            });
        });
    });

    describe("path", () => {
        test("basic", () => {
            @Ser()
            class Foo {
                @Ser({ path: "root:foo/bar" })
                a = 1;

                @Ser({ path: "root:foo/baz/quux" })
                b = 2;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(
                `{"root:foo":{"bar":{"a":1},"baz":{"quux":{"b":2}}}}`,
            );
        });

        test("rename + custom", () => {
            @Ser()
            class Foo {
                @Ser({
                    path: "root:foo",
                    rename: "__rename__",
                })
                rename = 1;

                @Ser({
                    path: "root:foo/bar",
                    rename: "__rename__",
                    custom: (v) => v,
                })
                renameWithCustom = { a: 1 };
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(
                `{"root:foo":{"__rename__":1,"bar":{"__rename__":{"a":1}}}}`,
            );
        });

        test("transparent", () => {
            @Ser({ transparent: "value" })
            class Foo {
                @Ser({ path: "root:foo/bar" })
                value = 1;
            }

            expect(JSON.stringify(new Foo())).toStrictEqual(`1`);
        });

        describe("omits empty nested objects", () => {
            test("undefined field", () => {
                @Ser()
                class Foo {
                    @Ser({ path: "a/b" })
                    x: number | undefined = undefined;
                }

                expect(JSON.stringify(new Foo())).toStrictEqual(`{}`);
            });

            test("default-omitted field", () => {
                @Ser()
                class Foo {
                    @Ser({ path: "a/b", default: () => 1 })
                    x = 1;
                }

                expect(JSON.stringify(new Foo())).toStrictEqual(`{}`);
            });

            test("sibling path keeps only defined", () => {
                @Ser()
                class Foo {
                    @Ser({ path: "a/b" })
                    x = 1;

                    @Ser({ path: "a/c" })
                    y: number | undefined = undefined;
                }

                expect(JSON.stringify(new Foo())).toStrictEqual(`{"a":{"b":{"x":1}}}`);
            });

            test("all path fields undefined", () => {
                @Ser()
                class Foo {
                    @Ser({ path: "a/b" })
                    x: number | undefined = undefined;

                    @Ser({ path: "a/c" })
                    y: number | undefined = undefined;
                }

                expect(JSON.stringify(new Foo())).toStrictEqual(`{}`);
            });
        });

        test("empty path segment", () => {
            for (const path of ["", "a//b", "/a", "a/", "/"]) {
                expect(() => {
                    @Ser()
                    // oxlint-disable-next-line no-unused-vars
                    class Foo {
                        @Ser({ path })
                        x = 1;
                    }
                }).toThrow(`Path '${path}' contains an empty segment`);
            }
        });

        describe("path key vs field key", () => {
            test("path then plain field", () => {
                expect(() => {
                    @Ser()
                    // oxlint-disable-next-line no-unused-vars
                    class Foo {
                        @Ser({ path: "nested" })
                        x = 1;

                        @Ser()
                        nested = { y: 2 };
                    }
                }).toThrow("Serialized key 'nested' collides in class 'Foo'");
            });

            test("plain field then path", () => {
                expect(() => {
                    @Ser()
                    // oxlint-disable-next-line no-unused-vars
                    class Foo {
                        @Ser()
                        nested = { y: 2 };

                        @Ser({ path: "nested" })
                        x = 1;
                    }
                }).toThrow("Serialized key 'nested' collides in class 'Foo'");
            });
        });
    });

    describe("nested", () => {
        test("basic", () => {
            @Ser()
            class Child {
                @Ser({ rename: "b" })
                a = "foo";
            }

            @Ser()
            class Parent {
                @Ser()
                child = new Child();
            }

            expect(JSON.stringify(new Parent())).toStrictEqual(`{"child":{"b":"foo"}}`);
        });

        test('"transparent"', () => {
            @Ser()
            class Child {
                @Ser({ rename: "b" })
                a = "foo";
            }

            @Ser({ transparent: "child" })
            class Parent {
                @Ser()
                child = new Child();
            }

            expect(JSON.stringify(new Parent())).toStrictEqual(`{"b":"foo"}`);
        });
    });
});

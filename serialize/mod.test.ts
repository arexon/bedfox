import {
    createSer,
    DuplicateToJsonError,
    FieldCasing,
    PathCollisionError,
    Ser,
    UnknownTransparentFieldError,
} from "./mod.ts";
import { assertEquals, assertThrows } from "@std/assert";

Deno.test("toJSON()", async (ctx) => {
    await ctx.step("empty", () => {
        @Ser()
        class Foo {}

        assertEquals(JSON.stringify(new Foo()), `{}`);
    });

    await ctx.step("basic", () => {
        @Ser()
        class Foo {
            @Ser()
            a = 8;

            @Ser()
            b = "foo";
        }

        assertEquals(JSON.stringify(new Foo()), `{"a":8,"b":"foo"}`);
    });

    await ctx.step("special field names", async (ctx) => {
        await ctx.step("basic special chars", () => {
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

            assertEquals(
                JSON.stringify(new Foo()),
                `{"10":0,"*":0,"$":0,"a:bB":0}`,
            );
        });

        await ctx.step("quote in field name", () => {
            @Ser()
            class Foo {
                @Ser()
                ['a"b'] = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"a\\"b":1}`);
        });

        await ctx.step("backslash in field name", () => {
            @Ser()
            class Foo {
                @Ser()
                ["a\\b"] = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"a\\\\b":1}`);
        });

        await ctx.step("newline in field name", () => {
            @Ser()
            class Foo {
                @Ser()
                ["a\nb"] = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"a\\nb":1}`);
        });

        await ctx.step("space not mangled by casing", () => {
            @Ser()
            class Foo {
                @Ser()
                ["foo bar"] = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"foo bar":1}`);
        });

        await ctx.step("leading underscore not stripped", () => {
            @Ser()
            class Foo {
                @Ser()
                _x = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"_x":1}`);
        });

        await ctx.step("quote in rename", () => {
            @Ser()
            class Foo {
                @Ser({ rename: 'a"b' })
                x = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"a\\"b":1}`);
        });

        await ctx.step("quote in path", () => {
            @Ser()
            class Foo {
                @Ser({ path: 'a"b' })
                x = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"a\\"b":{"x":1}}`);
        });
    });

    await ctx.step("private fields access", async (ctx) => {
        await ctx.step("direct or via custom override", () => {
            @Ser()
            class Foo {
                @Ser()
                a = 1;

                @Ser()
                #b = 2;

                @Ser({ custom: (v) => `got:${v}` })
                #c = 3;
            }

            assertEquals(
                JSON.stringify(new Foo()),
                `{"a":1,"#c":"got:undefined"}`,
            );
        });

        await ctx.step("transparent", () => {
            @Ser({ transparent: "#x" })
            class Foo {
                #x = 42;
            }

            assertEquals(JSON.stringify(new Foo()), undefined);
        });
    });

    await ctx.step("inherit", async (ctx) => {
        @Ser()
        class Parent {
            @Ser({ rename: "b" })
            a = "foo";
        }

        await ctx.step("no method conflict", () => {
            class Child extends Parent {}

            assertEquals(JSON.stringify(new Child()), `{"b":"foo"}`);
        });

        await ctx.step("method conflict", () => {
            assertThrows(
                () => {
                    @Ser()
                    // deno-lint-ignore no-unused-vars
                    class Child extends Parent {}
                },
                DuplicateToJsonError,
                "Class 'Child' already has a toJSON() method defined",
            );
        });
    });

    await ctx.step("casing", async (ctx) => {
        await ctx.step("camelCase", () => {
            @Ser()
            class Foo {
                @Ser()
                fooBarBazQux = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"fooBarBazQux":1}`);
        });

        await ctx.step("kebab-case", () => {
            const Ser = createSer({ fieldCasing: FieldCasing.Kebab });

            @Ser()
            class Foo {
                @Ser()
                fooBarBazQux = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"foo-bar-baz-qux":1}`);
        });

        await ctx.step("PascalCase", () => {
            const Ser = createSer({ fieldCasing: FieldCasing.Pascal });

            @Ser()
            class Foo {
                @Ser()
                fooBarBazQux = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"FooBarBazQux":1}`);
        });

        await ctx.step("snake_case", () => {
            const Ser = createSer({ fieldCasing: FieldCasing.Snake });

            @Ser()
            class Foo {
                @Ser()
                fooBarBazQux = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"foo_bar_baz_qux":1}`);
        });
    });

    await ctx.step("rename", async (ctx) => {
        await ctx.step("basic", () => {
            @Ser()
            class Foo {
                @Ser({ rename: "no" })
                yes = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `{"no":1}`);
        });
    });

    await ctx.step("defaults", async (ctx) => {
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
        await ctx.step("all", () => {
            assertEquals(JSON.stringify(v), `{"noDefault":8}`);
        });

        await ctx.step("primitive", () => {
            v.primitive = "qux";
            assertEquals(
                JSON.stringify(v),
                `{"noDefault":8,"primitive":"qux"}`,
            );
        });

        await ctx.step("object", () => {
            v.object.push("baz");
            assertEquals(
                JSON.stringify(v),
                `{"noDefault":8,"primitive":"qux","object":["foo","bar","baz"]}`,
            );
        });

        await ctx.step("instance", () => {
            v.instance.a = 10;
            assertEquals(
                JSON.stringify(v),
                `{"noDefault":8,"primitive":"qux","object":["foo","bar","baz"],"instance":{"a":10}}`,
            );
        });
    });

    await ctx.step("custom override", () => {
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
        assertEquals(JSON.stringify(v), `{"a":["custom","foo"]}`);

        v.aDefaulted = "bar";
        assertEquals(
            JSON.stringify(v),
            `{"a":["custom","foo"],"aDefaulted":["custom","bar"]}`,
        );
    });

    await ctx.step("transparent", async (ctx) => {
        await ctx.step("unknown field", () => {
            assertThrows(
                () => {
                    @Ser({ transparent: "wrong" })
                    // deno-lint-ignore no-unused-vars
                    class Transparent {
                        @Ser()
                        a = "foo";
                    }
                },
                UnknownTransparentFieldError,
                "Cannot find a matching instance/getter field named 'wrong' in class 'Transparent'",
            );
        });

        await ctx.step("without requiring undefined for other fields", () => {
            const Ser = createSer({ requireUndefinedForTransparency: false });

            @Ser({ transparent: "a" })
            class NoRequireUndefined {
                @Ser()
                a = "foo";
                @Ser()
                b: boolean | undefined = undefined;
            }

            const v = new NoRequireUndefined();
            assertEquals(JSON.stringify(v), `"foo"`);
            v.b = false;
            assertEquals(JSON.stringify(v), `"foo"`);
        });

        await ctx.step("with default", () => {
            @Ser({ transparent: "basic" })
            class WithDefault {
                @Ser()
                basic = "foo";

                @Ser({ default: () => true })
                default = true;
            }

            const v = new WithDefault();
            assertEquals(JSON.stringify(v), `"foo"`);

            v.default = false;
            assertEquals(JSON.stringify(v), `{"basic":"foo","default":false}`);
        });

        await ctx.step("on default", () => {
            @Ser({ transparent: "default" })
            class OnDefault {
                @Ser({ default: () => true })
                default = true;
            }

            const v = new OnDefault();
            assertEquals(JSON.stringify(v), `true`);

            v.default = false;
            assertEquals(JSON.stringify(v), `false`);
        });

        await ctx.step("on custom + on default", () => {
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
            assertEquals(
                JSON.stringify(v),
                `{"basic":"foo","custom":["custom","bar"]}`,
            );

            v.custom = "foo";
            assertEquals(JSON.stringify(v), `{"basic":"foo"}`);

            v.basic = undefined;
            assertEquals(JSON.stringify(v), `["custom","foo"]`);
        });

        await ctx.step("on getter", () => {
            @Ser({ transparent: "name" })
            class OnGetter {
                get name(): string {
                    return "foo";
                }
            }

            assertEquals(JSON.stringify(new OnGetter()), `"foo"`);
        });
    });

    await ctx.step("path", async (ctx) => {
        await ctx.step("basic", () => {
            @Ser()
            class Foo {
                @Ser({ path: "root:foo/bar" })
                a = 1;

                @Ser({ path: "root:foo/baz/quux" })
                b = 2;
            }

            assertEquals(
                JSON.stringify(new Foo()),
                `{"root:foo":{"bar":{"a":1},"baz":{"quux":{"b":2}}}}`,
            );
        });

        await ctx.step("rename + custom", () => {
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

            assertEquals(
                JSON.stringify(new Foo()),
                `{"root:foo":{"__rename__":1,"bar":{"__rename__":{"a":1}}}}`,
            );
        });

        await ctx.step("transparent", () => {
            @Ser({ transparent: "value" })
            class Foo {
                @Ser({ path: "root:foo/bar" })
                value = 1;
            }

            assertEquals(JSON.stringify(new Foo()), `1`);
        });

        await ctx.step("path key vs field key", async (ctx) => {
            await ctx.step("path then plain field", () => {
                assertThrows(
                    () => {
                        @Ser()
                        // deno-lint-ignore no-unused-vars
                        class Foo {
                            @Ser({ path: "nested" })
                            x = 1;

                            @Ser()
                            nested = { y: 2 };
                        }
                    },
                    PathCollisionError,
                    "Serialized key 'nested' collides in class 'Foo'",
                );
            });

            await ctx.step("plain field then path", () => {
                assertThrows(
                    () => {
                        @Ser()
                        // deno-lint-ignore no-unused-vars
                        class Foo {
                            @Ser()
                            nested = { y: 2 };

                            @Ser({ path: "nested" })
                            x = 1;
                        }
                    },
                    PathCollisionError,
                    "Serialized key 'nested' collides in class 'Foo'",
                );
            });
        });
    });

    await ctx.step("nested", async (ctx) => {
        await ctx.step("basic", () => {
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

            assertEquals(JSON.stringify(new Parent()), `{"child":{"b":"foo"}}`);
        });

        await ctx.step(JSON.stringify("transparent"), () => {
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

            assertEquals(JSON.stringify(new Parent()), `{"b":"foo"}`);
        });
    });
});

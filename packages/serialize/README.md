# `@bedfox/serialize`

TypeScript serialization library that eliminates the need for manually implementing `toJSON()` on
classes by utilizing TypeScript's
[legacy decorators](https://www.typescriptlang.org/docs/handbook/decorators.html) and autogenerating
optimized methods. It also exposes options for configuring how each field should be serialized.

## Installation

```bash
pnpm add @bedfox/serialize
```

Enable `experimentalDecorators` in your `tsconfig.json`. TypeScript, Oxc, SWC, and esbuild all
compile these decorators. Decorated fields must use regular names, so private `#fields` and symbol
keys aren't supported.

## Usage

Annotate the `Ser` decorator on your class to generate a `toJSON()`. It must also be annotated on
fields you wish to be serialized.

Field names are converted to snake_case.

```ts
import { Ser } from "@bedfox/serialize";
import { assertEquals } from "@std/assert";

@Ser()
class Person {
    @Ser()
    name: string = "Alice";
    age: number = 25;
}

assertEquals(JSON.stringify(new Person()), `{"name":"Alice"}`);
```

### Configuration

`Ser` can take `ClassOptions` or `FieldOptions` depending on where it's placed.

#### `ClassOptions.transparent`

A field (instance field or getter) to use as the serialized value for the class. This only applies
if every other field annotated with `Ser` is undefined (or at its `FieldOptions.default`) at
serialization-time.

```ts
import { Ser } from "@bedfox/serialize";
import { assertEquals } from "@std/assert";

@Ser({ transparent: "value" })
class Name {
    @Ser()
    value: string;
    @Ser()
    data: any;

    constructor(name: string) {
        this.value = name;
    }
}

const name = new Name("Jane");
assertEquals(JSON.stringify(name), `"Jane"`);
name.data = 1;
assertEquals(JSON.stringify(name), `{"value":"Jane","data":1}`);
```

#### `FieldOptions.default`

A callback that returns the default value for this field.

During serialization, the default value is compared against the field's current value. If it
matches, the field is omitted. The comparison uses `isDeepStrictEqual` from `node:util`, which only
looks at own enumerable properties. For classes that keep state in private fields, use `custom`
returning `undefined` to omit the field instead.

```ts
import { Ser } from "@bedfox/serialize";
import { assertEquals } from "@std/assert";

@Ser()
class FmtConfig {
    @Ser({ default: () => true })
    minify: boolean = true;
}

const conf = new FmtConfig();
assertEquals(JSON.stringify(conf), `{}`);
conf.minify = false;
assertEquals(JSON.stringify(conf), `{"minify":false}`);
```

#### `FieldOptions.custom`

Defines a callback that returns a custom value to override the serialized field value.

When `FieldOptions.default` is set, it is compared against the field's current value (not the custom
output). If they match, the field is omitted.

This can be used in conjunction with `ClassOptions.transparent` to completely change how the class
is serialized.

```ts
import { Ser } from "@bedfox/serialize";
import { assertEquals } from "@std/assert";

@Ser({ transparent: "#value" })
class Rgb {
    r: number;
    g: number;
    b: number;
    @Ser({
        custom() {
            return `${this.r},${this.g},${this.b}`;
        },
    })
    #value: string = "";

    constructor(r: number, g: number, b: number) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
}

assertEquals(JSON.stringify(new Rgb(209, 151, 240)), `"209,151,240"`);
```

#### `FieldOptions.rename`

A custom name for the serialized field.

```ts
import { Ser } from "@bedfox/serialize";
import { assertEquals } from "@std/assert";

@Ser()
class Info {
    @Ser({ rename: "cats" })
    cars: number = 64;
}

assertEquals(JSON.stringify(new Info()), `{"cats":64}`);
```

#### `FieldOptions.path`

A path within the serialized object to place this field, delimited by "/".

Each part of the path is created as an object if it does not already exist.

Two fields cannot claim the same serialized key or path segment (e.g. `@Ser({ path: "nested" }) x`
together with `@Ser() nested`). Otherwise, `PathCollisionError` is thrown.

```ts
import { Ser } from "@bedfox/serialize";
import { assertEquals } from "@std/assert";

@Ser()
class Puppy {
    @Ser({ path: "class:dog/puppy" })
    isCute: boolean = true;
}

assertEquals(JSON.stringify(new Puppy()), `{"class:dog":{"puppy":{"is_cute":true}}}`);
```

### Field Name Handling

Field names can be affected by multiple options. Below is their priority order (highest gets picked
first):

1. `FieldOptions.rename`
2. snake_case conversion
3. The actual field name.

## License

This library is licensed under the MIT license.

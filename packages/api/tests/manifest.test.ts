import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
    DataModule,
    DropdownSetting,
    DuplicateModuleUuidError,
    InvalidModulesError,
    LabelSetting,
    Manifest,
    MultiSelectSetting,
    ResourcesModule,
    ScriptModule,
    SliderSetting,
    ToggleSetting,
} from "#/manifest/index";
import { deriveUuid } from "#/manifest/uuid";

const NS = "test";

// UUIDs for the tests that set their own instead of deriving them.
const PACK_UUID = "293b30c7-f6b1-4ab8-8990-3cb047c030c3";
const MODULE_UUID = "aae5d295-37dc-4709-8b9b-1605be17a40b";
const OTHER_PACK_UUID = "e9632745-30e8-4cf4-a8d8-5ad2f44605ea";

/** A behavior pack manifest with everything it needs to serialize. */
function ready(): Manifest {
    return new Manifest(NS).authors("test").module(new DataModule());
}

/** A resource pack manifest. */
function resourcePack(): Manifest {
    return new Manifest(NS).authors("test").module(new ResourcesModule());
}

describe(Manifest.name, () => {
    test("full", (t) => {
        const rp = resourcePack().version("2.0.0");
        t.assert.snapshot(
            new Manifest(NS)
                .authors("arexon")
                .name("Test BP")
                .description("Everything at once")
                .version("1.2.3-beta.1")
                .minEngineVersion("1.26.50")
                .scope("world")
                .uuid(PACK_UUID)
                .module(
                    new DataModule().uuid(MODULE_UUID),
                    new ScriptModule("scripts/main.js")
                        .dependsOn("@minecraft/server", "2.1.0")
                        .optionallyDependsOn("@minecraft/server-ui", "beta"),
                )
                .dependsOn(rp)
                .capabilities("editorExtension")
                .license("Apache-2.0")
                .url("https://github.com/arexon/bedfox")
                .productType("addon")
                .generatedWith("mctools", "0.12.0")
                .setting(new ToggleSetting("test:enabled", "Enabled").default(true))
                .subpack("hd", "HD", 3),
        );
    });

    describe("authors()", () => {
        test("adds to the constructor's", (t) => {
            t.assert.snapshot(ready().authors("other"));
        });
    });

    describe("kind", () => {
        test("comes from the modules", () => {
            assert.equal(resourcePack().kind, "resource");
            assert.equal(new Manifest(NS).module(new DataModule()).kind, "behavior");
            assert.equal(new Manifest(NS).module(new ScriptModule("main.js")).kind, "behavior");
        });

        test("rejects a resources module with data or scripts", () => {
            const mixed = resourcePack().module(new ScriptModule("main.js"));
            assert.throws(() => mixed.kind, InvalidModulesError);
            assert.throws(() => JSON.stringify(mixed), InvalidModulesError);
        });

        test("rejects a manifest without modules", () => {
            assert.throws(() => new Manifest(NS).kind, InvalidModulesError);
        });
    });

    describe("module()", () => {
        test("rejects two modules with the same uuid", () => {
            const bp = new Manifest(NS).module(new DataModule(), new DataModule());
            assert.throws(() => JSON.stringify(bp), DuplicateModuleUuidError);
        });

        test("ignores a module added twice", (t) => {
            const data = new DataModule();
            t.assert.snapshot(new Manifest(NS).authors("test").module(data, data));
        });
    });

    describe("dependsOn()", () => {
        test("reads the pack's uuid and version when serialized", (t) => {
            const rp = resourcePack();
            const bp = ready().dependsOn(rp);
            rp.uuid(OTHER_PACK_UUID).version("2.0.0");
            t.assert.snapshot(bp);
        });

        test("ignores the same pack twice", (t) => {
            const rp = resourcePack();
            t.assert.snapshot(ready().dependsOn(rp).dependsOn(rp));
        });
    });

    describe("generatedWith()", () => {
        test("can't replace bedfox's own entry", (t) => {
            t.assert.snapshot(ready().generatedWith("bedfox", "0.0.1"));
        });

        test("keeps tool names as written", (t) => {
            t.assert.snapshot(ready().generatedWith("myTool", "1"));
        });
    });

    describe("setting()", () => {
        test("every kind", (t) => {
            t.assert.snapshot(
                ready().setting(
                    new LabelSetting("Tune it"),
                    new ToggleSetting("test:enabled", "Enabled").default(true),
                    new SliderSetting("test:power", "Power", 1, 4).step(1).default(3),
                    new DropdownSetting("test:level", "Level")
                        .option("low", "Low")
                        .option("high", "High")
                        .default("high"),
                    new MultiSelectSetting("test:extras", "Extras")
                        .option("low", "Low")
                        .option("high", "High")
                        .defaults("low")
                        .selectionText("Extras picked"),
                ),
            );
        });

        test("keep their order across calls", (t) => {
            t.assert.snapshot(
                ready().setting(new LabelSetting("first")).setting(new LabelSetting("second")),
            );
        });

        test("ignores a setting added twice", (t) => {
            const label = new LabelSetting("once");
            t.assert.snapshot(ready().setting(label, label));
        });

        test("default toggles to off and multiselects to nothing", (t) => {
            t.assert.snapshot(
                ready().setting(
                    new ToggleSetting("test:on", "On"),
                    new MultiSelectSetting("test:extras", "Extras")
                        .option("low", "Low")
                        .option("high", "High"),
                ),
            );
        });

        test("default sliders to steps of 1 from min, and dropdowns to their first option", (t) => {
            t.assert.snapshot(
                ready().setting(
                    new SliderSetting("test:power", "Power", 2, 8),
                    new DropdownSetting("test:level", "Level")
                        .option("low", "Low")
                        .option("high", "High"),
                ),
            );
        });
    });

    describe("toJSON()", () => {
        test("derives what isn't set from the namespace", (t) => {
            t.assert.snapshot(resourcePack());
        });
    });
});

describe(DataModule.name, () => {
    test("can set its own uuid, version and description", (t) => {
        t.assert.snapshot(
            new Manifest(NS)
                .authors("test")
                .uuid(PACK_UUID)
                .module(new DataModule().uuid(MODULE_UUID).version("2.0.0").description("Logic")),
        );
    });
});

describe(ScriptModule.name, () => {
    test("derives its uuid from the header uuid and its entry", (t) => {
        t.assert.snapshot(ready().module(new ScriptModule("main.js")));
    });

    describe("dependsOn()", () => {
        test("replaces the version of a module depended on again", (t) => {
            t.assert.snapshot(
                ready().module(
                    new ScriptModule("main.js")
                        .dependsOn("@minecraft/server", "1.0.0")
                        .dependsOn("@minecraft/server", "2.1.0"),
                ),
            );
        });

        test("is written in the manifest's dependencies, after packs and once per module", (t) => {
            t.assert.snapshot(
                ready()
                    .module(
                        new ScriptModule("a.js").dependsOn("@minecraft/server", "1.0.0"),
                        new ScriptModule("b.js").dependsOn("@minecraft/server", "2.1.0"),
                    )
                    .dependsOn(resourcePack()),
            );
        });
    });
});

describe(deriveUuid.name, () => {
    test("is the same for the same name", () => {
        assert.equal(deriveUuid("test/behavior/header"), deriveUuid("test/behavior/header"));
    });

    test("differs by name", () => {
        assert.notEqual(deriveUuid("test/behavior/header"), deriveUuid("test/resource/header"));
    });

    test("is a version 5 uuid", () => {
        const uuid = deriveUuid("test");
        assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
});

import { describe, expect, test } from "vite-plus/test";

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
import { expectedManifest, json, NS } from "#/test/helpers";

// UUIDs for the tests that set their own instead of deriving them.
const PACK_UUID = "293b30c7-f6b1-4ab8-8990-3cb047c030c3";
const MODULE_UUID = "aae5d295-37dc-4709-8b9b-1605be17a40b";
const OTHER_PACK_UUID = "e9632745-30e8-4cf4-a8d8-5ad2f44605ea";

function ready(): Manifest {
    return new Manifest(NS).module(new DataModule());
}

function resourcePack(): Manifest {
    return new Manifest(NS).module(new ResourcesModule());
}

describe(Manifest.name, () => {
    test("full", () => {
        const rp = resourcePack().version("2.0.0");
        expect(
            json(
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
            ),
        ).toStrictEqual({
            format_version: 3,
            header: {
                name: "Test BP",
                description: "Everything at once",
                uuid: "293b30c7-f6b1-4ab8-8990-3cb047c030c3",
                version: "1.2.3-beta.1",
                min_engine_version: "1.26.50",
                pack_scope: "world",
            },
            modules: [
                {
                    type: "data",
                    uuid: "aae5d295-37dc-4709-8b9b-1605be17a40b",
                    version: "1.2.3-beta.1",
                },
                {
                    type: "script",
                    uuid: "92acdfd8-3470-5771-aafc-2f87a23ecc79",
                    version: "1.2.3-beta.1",
                    language: "javascript",
                    entry: "scripts/main.js",
                },
            ],
            dependencies: [
                {
                    uuid: "220a205f-0cf8-57cd-8ca3-b3a714e93a44",
                    version: "2.0.0",
                },
                {
                    module_name: "@minecraft/server",
                    version: "2.1.0",
                },
                {
                    module_name: "@minecraft/server-ui",
                    version: "beta",
                    optional: true,
                },
            ],
            settings: [
                {
                    type: "toggle",
                    name: "test:enabled",
                    text: "Enabled",
                    default: true,
                },
            ],
            subpacks: [
                {
                    name: "HD",
                    folder_name: "hd",
                    memory_performance_tier: 3,
                },
            ],
            capabilities: ["editorExtension"],
            metadata: {
                authors: ["arexon"],
                url: "https://github.com/arexon/bedfox",
                license: "Apache-2.0",
                product_type: "addon",
                generated_with: {
                    bedfox: ["1.0.0"],
                    mctools: ["0.12.0"],
                },
            },
        });
    });

    describe("authors()", () => {
        test("adds to earlier calls", () => {
            expect(json(ready().authors("test").authors("other"))).toStrictEqual(
                expectedManifest({ metadata: { authors: ["test", "other"] } }),
            );
        });
    });

    describe("kind", () => {
        test("comes from the modules", () => {
            expect(resourcePack().kind).toBe("resource");
            expect(new Manifest(NS).module(new DataModule()).kind).toBe("behavior");
            expect(new Manifest(NS).module(new ScriptModule("main.js")).kind).toBe("behavior");
        });

        test("rejects a resources module with data or scripts", () => {
            const mixed = resourcePack().module(new ScriptModule("main.js"));
            expect(() => mixed.kind).toThrow(InvalidModulesError);
            expect(() => JSON.stringify(mixed)).toThrow(InvalidModulesError);
        });

        test("rejects a manifest without modules", () => {
            expect(() => new Manifest(NS).kind).toThrow(InvalidModulesError);
        });
    });

    describe("module()", () => {
        test("rejects two modules with the same uuid", () => {
            const bp = new Manifest(NS).module(new DataModule(), new DataModule());
            expect(() => JSON.stringify(bp)).toThrow(DuplicateModuleUuidError);
        });

        test("ignores a module added twice", () => {
            const data = new DataModule();
            expect(json(new Manifest(NS).module(data, data))).toStrictEqual(expectedManifest());
        });
    });

    describe("dependsOn()", () => {
        test("reads the pack's uuid and version when serialized", () => {
            const rp = resourcePack();
            const bp = ready().dependsOn(rp);
            rp.uuid(OTHER_PACK_UUID).version("2.0.0");
            expect(json(bp)).toStrictEqual(
                expectedManifest({
                    dependencies: [
                        { uuid: "e9632745-30e8-4cf4-a8d8-5ad2f44605ea", version: "2.0.0" },
                    ],
                }),
            );
        });

        test("ignores the same pack twice", () => {
            const rp = resourcePack();
            expect(json(ready().dependsOn(rp).dependsOn(rp))).toStrictEqual(
                expectedManifest({
                    dependencies: [
                        { uuid: "220a205f-0cf8-57cd-8ca3-b3a714e93a44", version: "1.0.0" },
                    ],
                }),
            );
        });

        test("names a dependency without modules", () => {
            const bp = ready().dependsOn(new Manifest("other"));
            expect(() => JSON.stringify(bp)).toThrow(
                "dependency other isn't a behavior or resource pack",
            );
        });
    });

    describe("generatedWith()", () => {
        test("can't replace bedfox's own entry", () => {
            expect(json(ready().generatedWith("bedfox", "0.0.1"))).toStrictEqual(
                expectedManifest(),
            );
        });

        test("keeps tool names as written", () => {
            expect(json(ready().generatedWith("myTool", "1"))).toStrictEqual(
                expectedManifest({
                    metadata: { generated_with: { bedfox: ["1.0.0"], myTool: ["1"] } },
                }),
            );
        });
    });

    describe("setting()", () => {
        test("every kind", () => {
            expect(
                json(
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
                ),
            ).toStrictEqual(
                expectedManifest({
                    settings: [
                        {
                            type: "label",
                            text: "Tune it",
                        },
                        {
                            type: "toggle",
                            name: "test:enabled",
                            text: "Enabled",
                            default: true,
                        },
                        {
                            type: "slider",
                            name: "test:power",
                            text: "Power",
                            min: 1,
                            max: 4,
                            step: 1,
                            default: 3,
                        },
                        {
                            type: "dropdown",
                            name: "test:level",
                            text: "Level",
                            options: [
                                {
                                    name: "low",
                                    text: "Low",
                                },
                                {
                                    name: "high",
                                    text: "High",
                                },
                            ],
                            default: "high",
                        },
                        {
                            type: "multiselect",
                            name: "test:extras",
                            text: "Extras",
                            options: [
                                {
                                    name: "low",
                                    text: "Low",
                                },
                                {
                                    name: "high",
                                    text: "High",
                                },
                            ],
                            defaults: ["low"],
                            selection_text: "Extras picked",
                        },
                    ],
                }),
            );
        });

        test("keep their order across calls", () => {
            expect(
                json(
                    ready().setting(new LabelSetting("first")).setting(new LabelSetting("second")),
                ),
            ).toStrictEqual(
                expectedManifest({
                    settings: [
                        {
                            type: "label",
                            text: "first",
                        },
                        {
                            type: "label",
                            text: "second",
                        },
                    ],
                }),
            );
        });

        test("ignores a setting added twice", () => {
            const label = new LabelSetting("once");
            expect(json(ready().setting(label, label))).toStrictEqual(
                expectedManifest({
                    settings: [
                        {
                            type: "label",
                            text: "once",
                        },
                    ],
                }),
            );
        });

        test("default toggles to off and multiselects to nothing", () => {
            expect(
                json(
                    ready().setting(
                        new ToggleSetting("test:on", "On"),
                        new MultiSelectSetting("test:extras", "Extras")
                            .option("low", "Low")
                            .option("high", "High"),
                    ),
                ),
            ).toStrictEqual(
                expectedManifest({
                    settings: [
                        {
                            type: "toggle",
                            name: "test:on",
                            text: "On",
                            default: false,
                        },
                        {
                            type: "multiselect",
                            name: "test:extras",
                            text: "Extras",
                            options: [
                                {
                                    name: "low",
                                    text: "Low",
                                },
                                {
                                    name: "high",
                                    text: "High",
                                },
                            ],
                            defaults: [],
                        },
                    ],
                }),
            );
        });

        test("default sliders to steps of 1 from min, and dropdowns to their first option", () => {
            expect(
                json(
                    ready().setting(
                        new SliderSetting("test:power", "Power", 2, 8),
                        new DropdownSetting("test:level", "Level")
                            .option("low", "Low")
                            .option("high", "High"),
                    ),
                ),
            ).toStrictEqual(
                expectedManifest({
                    settings: [
                        {
                            type: "slider",
                            name: "test:power",
                            text: "Power",
                            min: 2,
                            max: 8,
                            step: 1,
                            default: 2,
                        },
                        {
                            type: "dropdown",
                            name: "test:level",
                            text: "Level",
                            options: [
                                {
                                    name: "low",
                                    text: "Low",
                                },
                                {
                                    name: "high",
                                    text: "High",
                                },
                            ],
                            default: "low",
                        },
                    ],
                }),
            );
        });
    });

    describe("toJSON()", () => {
        test("derives what isn't set from the namespace", () => {
            expect(json(ready())).toStrictEqual(expectedManifest());
            expect(json(resourcePack())).toStrictEqual(
                expectedManifest({
                    header: { name: "test RP", uuid: "220a205f-0cf8-57cd-8ca3-b3a714e93a44" },
                    modules: [
                        {
                            type: "resources",
                            uuid: "804ee873-8c54-5f00-9f8a-96b855a22a24",
                            version: "1.0.0",
                        },
                    ],
                }),
            );
        });
    });
});

describe(DataModule.name, () => {
    test("can set its own uuid, version and description", () => {
        expect(
            json(
                new Manifest(NS)
                    .uuid(PACK_UUID)
                    .module(
                        new DataModule().uuid(MODULE_UUID).version("2.0.0").description("Logic"),
                    ),
            ),
        ).toStrictEqual(
            expectedManifest({
                header: { uuid: "293b30c7-f6b1-4ab8-8990-3cb047c030c3" },
                modules: [
                    {
                        type: "data",
                        uuid: "aae5d295-37dc-4709-8b9b-1605be17a40b",
                        version: "2.0.0",
                        description: "Logic",
                    },
                ],
            }),
        );
    });
});

describe(ScriptModule.name, () => {
    test("derives its uuid from the header uuid and its entry", () => {
        expect(json(ready().module(new ScriptModule("main.js")))).toStrictEqual(
            expectedManifest({
                modules: [
                    {
                        type: "data",
                        uuid: "820c330d-fc15-5a5c-a3d6-a84a35ccd916",
                        version: "1.0.0",
                    },
                    {
                        type: "script",
                        uuid: "607dee5f-8e9d-5a88-959f-9aeb03e91950",
                        version: "1.0.0",
                        language: "javascript",
                        entry: "main.js",
                    },
                ],
            }),
        );
    });

    describe("dependsOn()", () => {
        test("replaces the version of a module depended on again", () => {
            expect(
                json(
                    ready().module(
                        new ScriptModule("main.js")
                            .dependsOn("@minecraft/server", "1.0.0")
                            .dependsOn("@minecraft/server", "2.1.0"),
                    ),
                ),
            ).toStrictEqual(
                expectedManifest({
                    modules: [
                        {
                            type: "data",
                            uuid: "820c330d-fc15-5a5c-a3d6-a84a35ccd916",
                            version: "1.0.0",
                        },
                        {
                            type: "script",
                            uuid: "607dee5f-8e9d-5a88-959f-9aeb03e91950",
                            version: "1.0.0",
                            language: "javascript",
                            entry: "main.js",
                        },
                    ],
                    dependencies: [
                        {
                            module_name: "@minecraft/server",
                            version: "2.1.0",
                        },
                    ],
                }),
            );
        });

        test("is written in the manifest's dependencies, after packs and once per module", () => {
            expect(
                json(
                    ready()
                        .module(
                            new ScriptModule("a.js").dependsOn("@minecraft/server", "1.0.0"),
                            new ScriptModule("b.js").dependsOn("@minecraft/server", "2.1.0"),
                        )
                        .dependsOn(resourcePack()),
                ),
            ).toStrictEqual(
                expectedManifest({
                    modules: [
                        {
                            type: "data",
                            uuid: "820c330d-fc15-5a5c-a3d6-a84a35ccd916",
                            version: "1.0.0",
                        },
                        {
                            type: "script",
                            uuid: "067980a3-862d-5143-a529-bdb966673bc6",
                            version: "1.0.0",
                            language: "javascript",
                            entry: "a.js",
                        },
                        {
                            type: "script",
                            uuid: "f4a291db-b71f-509e-9825-96d3738a266f",
                            version: "1.0.0",
                            language: "javascript",
                            entry: "b.js",
                        },
                    ],
                    dependencies: [
                        {
                            uuid: "220a205f-0cf8-57cd-8ca3-b3a714e93a44",
                            version: "1.0.0",
                        },
                        {
                            module_name: "@minecraft/server",
                            version: "2.1.0",
                        },
                    ],
                }),
            );
        });
    });
});

describe(deriveUuid.name, () => {
    test("is the same for the same name", () => {
        expect(deriveUuid("test/behavior/header")).toBe(deriveUuid("test/behavior/header"));
    });

    test("differs by name", () => {
        expect(deriveUuid("test/behavior/header")).not.toBe(deriveUuid("test/resource/header"));
    });

    test("is a version 5 uuid", () => {
        const uuid = deriveUuid("test");
        expect(uuid).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
    });
});

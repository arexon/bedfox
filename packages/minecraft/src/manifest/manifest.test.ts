import { Project } from "@bedfox/core";
import { describe, expect, test } from "vite-plus/test";

import { engineVersion } from "#/manifest/engine_version";
import {
    BehaviorManifest,
    DataModule,
    DropdownSetting,
    DuplicateModuleUuidError,
    InvalidModulesError,
    LabelSetting,
    Manifest,
    MultiSelectSetting,
    ResourceManifest,
    ScriptModule,
    SliderSetting,
    ToggleSetting,
} from "#/manifest/index";
import { deriveUuid } from "#/manifest/uuid";
import { ManifestPlugin } from "#/plugins/index";
import { BEDFOX_VERSIONS, emitted, expectedManifest, json, NS } from "#/test/helpers";

// UUIDs for the tests that set their own instead of deriving them.
const PACK_UUID = "293b30c7-f6b1-4ab8-8990-3cb047c030c3";
const MODULE_UUID = "aae5d295-37dc-4709-8b9b-1605be17a40b";
const OTHER_PACK_UUID = "e9632745-30e8-4cf4-a8d8-5ad2f44605ea";

describe(Manifest.name, () => {
    test("full", () => {
        const rp = new ResourceManifest().version("2.0.0");
        expect(
            emitted(
                new Manifest()
                    .authors("Alex")
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
                    .url("https://example.com/pack")
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
                authors: ["Alex"],
                url: "https://example.com/pack",
                license: "Apache-2.0",
                product_type: "addon",
                generated_with: {
                    bedfox: BEDFOX_VERSIONS,
                    mctools: ["0.12.0"],
                },
            },
        });
    });

    describe("authors()", () => {
        test("adds to earlier calls", () => {
            expect(emitted(new BehaviorManifest().authors("test").authors("other"))).toStrictEqual(
                expectedManifest({ metadata: { authors: ["test", "other"] } }),
            );
        });
    });

    describe("kind", () => {
        test("comes from the modules", () => {
            expect(new ResourceManifest().kind).toBe("resource");
            expect(new Manifest().module(new DataModule()).kind).toBe("behavior");
            expect(new Manifest().module(new ScriptModule("main.js")).kind).toBe("behavior");
        });

        test("rejects a resources module with data or scripts", () => {
            const mixed = new ResourceManifest().module(new ScriptModule("main.js"));
            expect(() => mixed.kind).toThrow(InvalidModulesError);
            expect(() => emitted(mixed)).toThrow(InvalidModulesError);
        });

        test("rejects a manifest without modules", () => {
            expect(() => new Manifest().kind).toThrow(InvalidModulesError);
        });
    });

    describe("module()", () => {
        test("rejects two modules with the same uuid", () => {
            const bp = new Manifest().module(new DataModule(), new DataModule());
            expect(() => emitted(bp)).toThrow(DuplicateModuleUuidError);
        });

        test("ignores a module added twice", () => {
            const data = new DataModule();
            expect(emitted(new Manifest().module(data, data))).toStrictEqual(expectedManifest());
        });
    });

    describe("dependsOn()", () => {
        test("reads the pack's uuid and version when serialized", () => {
            const rp = new ResourceManifest();
            const bp = new BehaviorManifest().dependsOn(rp);
            rp.uuid(OTHER_PACK_UUID).version("2.0.0");
            expect(emitted(bp)).toStrictEqual(
                expectedManifest({
                    dependencies: [
                        { uuid: "e9632745-30e8-4cf4-a8d8-5ad2f44605ea", version: "2.0.0" },
                    ],
                }),
            );
        });

        test("ignores the same pack twice", () => {
            const rp = new ResourceManifest();
            expect(emitted(new BehaviorManifest().dependsOn(rp).dependsOn(rp))).toStrictEqual(
                expectedManifest({
                    dependencies: [
                        { uuid: "220a205f-0cf8-57cd-8ca3-b3a714e93a44", version: "1.0.0" },
                    ],
                }),
            );
        });

        test("names a dependency without modules", () => {
            const bp = new BehaviorManifest().dependsOn(new Manifest().name("Other"));
            expect(() => emitted(bp)).toThrow("dependency Other isn't a behavior or resource pack");
        });
    });

    describe("generatedWith()", () => {
        test("can't replace bedfox's own entry", () => {
            expect(emitted(new BehaviorManifest().generatedWith("bedfox", "0.0.1"))).toStrictEqual(
                expectedManifest(),
            );
        });

        test("keeps tool names as written", () => {
            expect(emitted(new BehaviorManifest().generatedWith("myTool", "1"))).toStrictEqual(
                expectedManifest({
                    metadata: { generated_with: { bedfox: BEDFOX_VERSIONS, myTool: ["1"] } },
                }),
            );
        });
    });

    describe("setting()", () => {
        test("every kind", () => {
            expect(
                emitted(
                    new BehaviorManifest().setting(
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
                emitted(
                    new BehaviorManifest()
                        .setting(new LabelSetting("first"))
                        .setting(new LabelSetting("second")),
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
            expect(emitted(new BehaviorManifest().setting(label, label))).toStrictEqual(
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
                emitted(
                    new BehaviorManifest().setting(
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
                emitted(
                    new BehaviorManifest().setting(
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

    describe("emit()", () => {
        test("derives what isn't set from the namespace", () => {
            expect(emitted(new BehaviorManifest())).toStrictEqual(expectedManifest());
            expect(emitted(new ResourceManifest())).toStrictEqual(
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

describe(ManifestPlugin.name, () => {
    const RP_DEPENDENCY = { uuid: "220a205f-0cf8-57cd-8ca3-b3a714e93a44", version: "1.0.0" };

    test("adds both manifests, with the behavior pack depending on the resource pack", async () => {
        const project = new Project(NS).addPlugin(new ManifestPlugin());
        const [bp, rp] = (await project.run()).emit();
        expect(json(bp)).toStrictEqual({
            kind: "behavior",
            path: "manifest.json",
            format: "json",
            value: expectedManifest({ dependencies: [RP_DEPENDENCY] }),
        });
        expect([rp.kind, rp.path]).toStrictEqual(["resource", "manifest.json"]);
    });

    test("keeps the changes of systems", async () => {
        const project = new Project(NS)
            .addSystem("setup", (reg) => {
                reg.resource(BehaviorManifest).module(new ScriptModule("scripts/main.js"));
            })
            .addPlugin(new ManifestPlugin());
        const reg = await project.run();
        expect(json(reg.emit()[0])).toStrictEqual({
            kind: "behavior",
            path: "manifest.json",
            format: "json",
            value: expectedManifest({
                modules: [
                    {
                        type: "data",
                        uuid: "820c330d-fc15-5a5c-a3d6-a84a35ccd916",
                        version: "1.0.0",
                    },
                    {
                        type: "script",
                        uuid: "07b7ee6b-32d0-5d5f-9cc1-722470ca9a17",
                        version: "1.0.0",
                        language: "javascript",
                        entry: "scripts/main.js",
                    },
                ],
                dependencies: [RP_DEPENDENCY],
            }),
        });
    });
});

describe(DataModule.name, () => {
    test("can set its own uuid, version and description", () => {
        expect(
            emitted(
                new Manifest()
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
        expect(emitted(new BehaviorManifest().module(new ScriptModule("main.js")))).toStrictEqual(
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
                emitted(
                    new BehaviorManifest().module(
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
                emitted(
                    new BehaviorManifest()
                        .module(
                            new ScriptModule("a.js").dependsOn("@minecraft/server", "1.0.0"),
                            new ScriptModule("b.js").dependsOn("@minecraft/server", "2.1.0"),
                        )
                        .dependsOn(new ResourceManifest()),
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

describe(engineVersion.name, () => {
    test("drops the prerelease and build parts", () => {
        expect(engineVersion("1.26.70")).toBe("1.26.70");
        expect(engineVersion("1.26.70-preview.22")).toBe("1.26.70");
        expect(engineVersion("1.26.70+fix.1")).toBe("1.26.70");
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

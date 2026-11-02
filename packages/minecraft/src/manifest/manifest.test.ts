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
import { DEFAULT_MIN_ENGINE_VERSION, ManifestPlugin } from "#/plugins/index";
import { BEDFOX_VERSIONS, emitted, expectedManifest, json, NS } from "#/test/helpers";

// UUIDs for the tests that set their own instead of deriving them.
const PACK_UUID = "293b30c7-f6b1-4ab8-8990-3cb047c030c3";
const MODULE_UUID = "aae5d295-37dc-4709-8b9b-1605be17a40b";
const OTHER_PACK_UUID = "e9632745-30e8-4cf4-a8d8-5ad2f44605ea";

// The header UUIDs that ManifestPlugin derives for the namespace `test`.
const BP_UUID = "bcd6188d-467b-56e7-a79d-1cfd2dca7dc2";
const RP_UUID = "220a205f-0cf8-57cd-8ca3-b3a714e93a44";

function withHeader<T extends Manifest>(manifest: T, name: string, uuid: string): T {
    return manifest.setName(name).setUuid(uuid).setMinEngineVersion("1.26.50");
}

function bp(): BehaviorManifest {
    return withHeader(new BehaviorManifest(), "test BP", BP_UUID);
}

function rp(): ResourceManifest {
    return withHeader(new ResourceManifest(), "test RP", RP_UUID);
}

describe(Manifest.name, () => {
    test("full", () => {
        const resource = rp().setVersion("2.0.0");
        expect(
            emitted(
                new Manifest()
                    .addAuthor("Alex")
                    .setName("Test BP")
                    .setDescription("Everything at once")
                    .setVersion("1.2.3-beta.1")
                    .setMinEngineVersion("1.26.50")
                    .setScope("world")
                    .setUuid(PACK_UUID)
                    .addModule(
                        new DataModule().setUuid(MODULE_UUID),
                        new ScriptModule("scripts/main.js")
                            .addDependency("@minecraft/server", "2.1.0")
                            .addOptionalDependency("@minecraft/server-ui", "beta"),
                    )
                    .addDependency(resource)
                    .addCapability("editorExtension")
                    .setLicense("Apache-2.0")
                    .setUrl("https://example.com/pack")
                    .setProductType("addon")
                    .setGeneratedWith("mctools", "0.12.0")
                    .addSetting(new ToggleSetting("test:enabled", "Enabled").setDefault(true))
                    .addSubpack("hd", "HD", 3),
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
                generated_with: { mctools: ["0.12.0"] },
            },
        });
    });

    describe("addAuthor()", () => {
        test("adds to earlier calls", () => {
            expect(emitted(bp().addAuthor("test").addAuthor("other"))).toStrictEqual(
                expectedManifest({ metadata: { authors: ["test", "other"] } }),
            );
        });
    });

    describe("kind", () => {
        test("comes from the modules", () => {
            expect(rp().kind).toBe("resource");
            expect(new Manifest().addModule(new DataModule()).kind).toBe("behavior");
            expect(new Manifest().addModule(new ScriptModule("main.js")).kind).toBe("behavior");
        });

        test("rejects a resources module with data or scripts", () => {
            const mixed = rp().addModule(new ScriptModule("main.js"));
            expect(() => mixed.kind).toThrow(InvalidModulesError);
            expect(() => emitted(mixed)).toThrow(InvalidModulesError);
        });

        test("rejects a manifest without modules", () => {
            expect(() => new Manifest().kind).toThrow(InvalidModulesError);
        });
    });

    describe("addModule()", () => {
        test("rejects two modules with the same uuid", () => {
            const manifest = withHeader(new Manifest(), "test BP", BP_UUID).addModule(
                new DataModule(),
                new DataModule(),
            );
            expect(() => emitted(manifest)).toThrow(DuplicateModuleUuidError);
        });

        test("ignores a module added twice", () => {
            const data = new DataModule();
            const manifest = withHeader(new Manifest(), "test BP", BP_UUID).addModule(data, data);
            expect(emitted(manifest)).toStrictEqual(expectedManifest());
        });
    });

    describe("removeModule()", () => {
        test("removes a module, and skips one that the manifest doesn't have", () => {
            const script = new ScriptModule("main.js");
            const manifest = bp().addModule(script).removeModule(script, new ScriptModule("b.js"));
            expect(emitted(manifest)).toStrictEqual(expectedManifest());
        });
    });

    describe("addDependency()", () => {
        test("reads the pack's uuid and version when serialized", () => {
            const resource = rp();
            const behavior = bp().addDependency(resource);
            resource.setUuid(OTHER_PACK_UUID).setVersion("2.0.0");
            expect(emitted(behavior)).toStrictEqual(
                expectedManifest({
                    dependencies: [
                        { uuid: "e9632745-30e8-4cf4-a8d8-5ad2f44605ea", version: "2.0.0" },
                    ],
                }),
            );
        });

        test("ignores the same pack twice", () => {
            const resource = rp();
            expect(emitted(bp().addDependency(resource).addDependency(resource))).toStrictEqual(
                expectedManifest({
                    dependencies: [
                        { uuid: "220a205f-0cf8-57cd-8ca3-b3a714e93a44", version: "1.0.0" },
                    ],
                }),
            );
        });

        test("rejects a dependency without a uuid", () => {
            const manifest = bp().addDependency(new Manifest().setName("Other"));
            expect(() => emitted(manifest)).toThrow(
                expect.objectContaining({
                    name: "IncompleteManifestError",
                    message: "The dependency Other needs setUuid(). Call it, or add ManifestPlugin",
                }),
            );
        });
    });

    describe("removeDependency()", () => {
        test("removes a pack, and skips one that isn't a dependency", () => {
            const resource = rp();
            const manifest = bp().addDependency(resource).removeDependency(resource);
            expect(emitted(manifest.removeDependency(rp()))).toStrictEqual(expectedManifest());
        });
    });

    describe("setGeneratedWith()", () => {
        test("records Bedfox like any other tool", () => {
            expect(emitted(bp().setGeneratedWith("bedfox", "0.0.1"))).toStrictEqual(
                expectedManifest({ metadata: { generated_with: { bedfox: ["0.0.1"] } } }),
            );
        });

        test("keeps tool names as written", () => {
            expect(emitted(bp().setGeneratedWith("myTool", "1"))).toStrictEqual(
                expectedManifest({
                    metadata: { generated_with: { myTool: ["1"] } },
                }),
            );
        });
    });

    describe("addSetting()", () => {
        test("every kind", () => {
            expect(
                emitted(
                    bp().addSetting(
                        new LabelSetting("Tune it"),
                        new ToggleSetting("test:enabled", "Enabled").setDefault(true),
                        new SliderSetting("test:power", "Power", 1, 4).setStep(1).setDefault(3),
                        new DropdownSetting("test:level", "Level")
                            .addOption("low", "Low")
                            .addOption("high", "High")
                            .setDefault("high"),
                        new MultiSelectSetting("test:extras", "Extras")
                            .addOption("low", "Low")
                            .addOption("high", "High")
                            .addDefault("low")
                            .setSelectionText("Extras picked"),
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
                    bp()
                        .addSetting(new LabelSetting("first"))
                        .addSetting(new LabelSetting("second")),
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
            expect(emitted(bp().addSetting(label, label))).toStrictEqual(
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
                    bp().addSetting(
                        new ToggleSetting("test:on", "On"),
                        new MultiSelectSetting("test:extras", "Extras")
                            .addOption("low", "Low")
                            .addOption("high", "High"),
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
                    bp().addSetting(
                        new SliderSetting("test:power", "Power", 2, 8),
                        new DropdownSetting("test:level", "Level")
                            .addOption("low", "Low")
                            .addOption("high", "High"),
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

    describe("removeSetting()", () => {
        test("removes a setting, and skips one that the manifest doesn't have", () => {
            const label = new LabelSetting("Tune it");
            const toggle = new ToggleSetting("test:on", "On");
            const manifest = bp()
                .addSetting(label, toggle)
                .removeSetting(label, new LabelSetting("Other"));
            expect(emitted(manifest)).toStrictEqual(
                expectedManifest({
                    settings: [{ type: "toggle", name: "test:on", text: "On", default: false }],
                }),
            );
        });
    });

    describe("emit()", () => {
        test("rejects a manifest without a name, uuid or min engine version", () => {
            expect(() => emitted(new BehaviorManifest())).toThrow(
                expect.objectContaining({
                    name: "IncompleteManifestError",
                    message:
                        "The behavior pack manifest needs setName(), setUuid(), setMinEngineVersion(). Call them, or add ManifestPlugin",
                }),
            );
        });

        test("derives the module uuids from the header uuid", () => {
            expect(emitted(bp())).toStrictEqual(expectedManifest());
            expect(emitted(rp())).toStrictEqual(
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
    const RP_DEPENDENCY = { uuid: RP_UUID, version: "1.0.0" };
    const DEFAULTS = {
        header: { min_engine_version: DEFAULT_MIN_ENGINE_VERSION },
        metadata: { generated_with: { bedfox: BEDFOX_VERSIONS } },
    };

    test("adds both manifests with their defaults, each depending on the other", async () => {
        const project = new Project(NS).addPlugin(new ManifestPlugin());
        const [behavior, resource] = (await project.run()).emit();
        expect(json(behavior)).toStrictEqual({
            kind: "behavior",
            path: "manifest.json",
            format: "json",
            value: expectedManifest({ ...DEFAULTS, dependencies: [RP_DEPENDENCY] }),
        });
        expect(json(resource)).toStrictEqual({
            kind: "resource",
            path: "manifest.json",
            format: "json",
            value: expectedManifest({
                ...DEFAULTS,
                header: { ...DEFAULTS.header, name: "test RP", uuid: RP_UUID },
                modules: [
                    {
                        type: "resources",
                        uuid: "804ee873-8c54-5f00-9f8a-96b855a22a24",
                        version: "1.0.0",
                    },
                ],
                dependencies: [{ uuid: BP_UUID, version: "1.0.0" }],
            }),
        });
    });

    test("lets setup systems change the defaults", async () => {
        const project = new Project(NS)
            .addSystem("setup", (reg) => {
                reg.resource(BehaviorManifest)
                    .setName("Custom")
                    .setGeneratedWith("bedfox", "custom");
            })
            .addPlugin(new ManifestPlugin());
        const [behavior] = (await project.run()).emit();
        expect(json(behavior)).toStrictEqual({
            kind: "behavior",
            path: "manifest.json",
            format: "json",
            value: expectedManifest({
                header: { ...DEFAULTS.header, name: "Custom" },
                metadata: { generated_with: { bedfox: ["custom"] } },
                dependencies: [RP_DEPENDENCY],
            }),
        });
    });

    test("keeps the modules that systems add", async () => {
        const project = new Project(NS)
            .addSystem("setup", (reg) => {
                reg.resource(BehaviorManifest).addModule(new ScriptModule("scripts/main.js"));
            })
            .addPlugin(new ManifestPlugin());
        const [behavior] = (await project.run()).emit();
        expect(json(behavior)).toStrictEqual({
            kind: "behavior",
            path: "manifest.json",
            format: "json",
            value: expectedManifest({
                ...DEFAULTS,
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
                withHeader(new Manifest(), "test BP", PACK_UUID).addModule(
                    new DataModule()
                        .setUuid(MODULE_UUID)
                        .setVersion("2.0.0")
                        .setDescription("Logic"),
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
        expect(emitted(bp().addModule(new ScriptModule("main.js")))).toStrictEqual(
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

    describe("addDependency()", () => {
        test("replaces the version of a module depended on again", () => {
            expect(
                emitted(
                    bp().addModule(
                        new ScriptModule("main.js")
                            .addDependency("@minecraft/server", "1.0.0")
                            .addDependency("@minecraft/server", "2.1.0"),
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
                    bp()
                        .addModule(
                            new ScriptModule("a.js").addDependency("@minecraft/server", "1.0.0"),
                            new ScriptModule("b.js").addDependency("@minecraft/server", "2.1.0"),
                        )
                        .addDependency(rp()),
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

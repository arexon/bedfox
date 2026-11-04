import { serialize } from "@bedfox/core";
import { describe, expect, test } from "vite-plus/test";

import { Block } from "#/block/index";
import {
    Definition,
    type DefinitionLocation,
    InvalidIdentifierError,
} from "#/definition/definition";
import { Feature } from "#/feature/base";
import { OreFeature } from "#/feature/ore";
import { FeatureRules } from "#/feature/rules";
import { ScatterFeature } from "#/feature/scatter";
import { FormatVersion } from "#/primitive/index";
import { emitted, json, NS } from "#/test/helpers";

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

    test("serialize as a definition file", () => {
        expect(json(new Thing("thing"))).toStrictEqual({
            format_version: "1.2.3",
            "test:thing": { description: { identifier: "thing" } },
        });
    });

    test("put description fields inside the description, next to the identifier", () => {
        const thing = Object.assign(new Thing("thing"), { note: "n", label: "l" });
        expect(json(thing)).toStrictEqual({
            format_version: "1.2.3",
            "test:thing": { description: { identifier: "thing", label: "l" }, note: "n" },
        });
    });

    test("use an explicit format version over the fallback", () => {
        const thing = Object.assign(new Thing("thing"), {
            formatVersion: new FormatVersion(1, 0, 0),
        });
        expect(json(thing)).toStrictEqual({
            format_version: "1.0.0",
            "test:thing": { description: { identifier: "thing" } },
        });
    });

    test("qualify the identifier with the namespace of the context", () => {
        expect(emitted(new Thing("thing"))).toStrictEqual({
            format_version: "1.2.3",
            "test:thing": { description: { identifier: `${NS}:thing` } },
        });
        expect(new Thing("thing").qualifiedIdentifier({ namespace: "other" })).toBe("other:thing");
    });

    test("remove a namespace from keys only when it is the given one", () => {
        expect(Definition.normalizeKey(`${NS}:dirt`, NS)).toBe("dirt");
        expect(Definition.normalizeKey("other:dirt", NS)).toBe("other:dirt");
        expect(Definition.normalizeKey("dirt", NS)).toBe("dirt");
    });

    test("leave string references as written", () => {
        const scatter = new ScatterFeature("scatter", { placesFeature: "other:ore" });
        expect(emitted(scatter)).toStrictEqual({
            format_version: "1.26.50",
            "minecraft:scatter_feature": {
                description: { identifier: `${NS}:scatter` },
                places_feature: "other:ore",
            },
        });
    });

    test("put each kind in its folder", () => {
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

    test("features are Feature subclasses", () => {
        const scatter = new ScatterFeature("scatter", { placesFeature: "test:feature" });
        expect(scatter).toBeInstanceOf(Feature);
        expect(json(scatter)).toStrictEqual({
            format_version: "1.26.50",
            "minecraft:scatter_feature": {
                description: { identifier: "scatter" },
                places_feature: "test:feature",
            },
        });
    });

    test("emit with the namespace, also in references", () => {
        const scatter = new ScatterFeature("scatter", { placesFeature: new OreFeature("ore") });
        expect(emitted(scatter)).toStrictEqual({
            format_version: "1.26.50",
            "minecraft:scatter_feature": {
                description: { identifier: `${NS}:scatter` },
                places_feature: `${NS}:ore`,
            },
        });
        expect(emitted(new Block("dirt"))).toStrictEqual({
            format_version: "1.26.40",
            "minecraft:block": { description: { identifier: `${NS}:dirt` } },
        });
    });
});

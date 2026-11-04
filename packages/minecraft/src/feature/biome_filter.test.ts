import { describe, expect, test } from "vite-plus/test";

import { BiomeFilter } from "#/feature/biome_filter";
import { json } from "#/test/helpers";

describe("BiomeFilter", () => {
    test("a single test serializes as one object", () => {
        const filter = new BiomeFilter().hasTag("forest");
        expect(json(filter)).toStrictEqual({
            test: "has_biome_tag",
            operator: "==",
            value: "forest",
        });
    });

    test("several tests serialize as an array", () => {
        const filter = new BiomeFilter().isBiome("plains").not.isSnowCovered();
        expect(json(filter)).toStrictEqual([
            { test: "is_biome", operator: "==", value: "plains" },
            { test: "is_snow_covered", operator: "!=", value: "true" },
        ]);
    });

    test("groups keep nested groups", () => {
        const filter = new BiomeFilter().allOf((b) =>
            b.hasTag("overworld").anyOf((x) => x.isBiome("a").isBiome("b")),
        );
        expect(json(filter)).toStrictEqual({
            all_of: [
                { test: "has_biome_tag", operator: "==", value: "overworld" },
                {
                    any_of: [
                        { test: "is_biome", operator: "==", value: "a" },
                        { test: "is_biome", operator: "==", value: "b" },
                    ],
                },
            ],
        });
    });

    test("a group that holds only a group keeps it", () => {
        const filter = new BiomeFilter().allOf((b) => b.anyOf((x) => x.isBiome("a")));
        expect(json(filter)).toStrictEqual({
            all_of: [{ any_of: [{ test: "is_biome", operator: "==", value: "a" }] }],
        });
    });
});

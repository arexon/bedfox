import { expect, test } from "vite-plus/test";

import { Block, MaterialInstancesBlockComponent } from "#/block/index";

test("permutations keep their components", () => {
    const block = new Block("custom:wood").pushPermutation(
        "q.block_state('custom:variant') == 0",
        new MaterialInstancesBlockComponent({ "*": { texture: "oak_planks" } }),
    );

    const json = JSON.parse(JSON.stringify(block));
    expect(json["minecraft:block"].permutations).toStrictEqual([
        {
            condition: "q.block_state('custom:variant') == 0",
            components: {
                "minecraft:material_instances": {
                    "*": { texture: "oak_planks" },
                },
            },
        },
    ]);
});

test("permutations without components omit the field", () => {
    const block = new Block("custom:wood").pushPermutation("true");

    const json = JSON.parse(JSON.stringify(block));
    expect(json["minecraft:block"].permutations).toStrictEqual([{ condition: "true" }]);
});

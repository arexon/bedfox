import { test } from "vite-plus/test";

import { Block, GeometryBlockComponent } from "#/block/index";
import { Definition } from "#/common/index";
import { Feature, FeatureRules, ScatterFeature, SnapToSurfaceFeature } from "#/feature/index";
import { Query, Registry } from "#/registry";

// oxlint-disable-next-line vitest/expect-expect
test("query sketch", () => {
    new Query(Block).filter(Block.withComponent(GeometryBlockComponent));

    const reg = new Registry("test");

    const someSys = new Query(FeatureRules, ScatterFeature)
        .filter(Feature.placing(SnapToSurfaceFeature))
        .system((_reg, fts) => {
            for (const _ft of fts) {
            }
        });

    reg.addSystem(someSys);

    new Query(Definition).filter(Definition.orphan());
});

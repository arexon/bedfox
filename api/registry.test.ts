import { Definition } from "@bedfox/api/common";
import { Block, GeometryBlockComponent } from "@bedfox/api/block";
import { FeatureRules } from "./feature/rules.ts";
import {
    Feature,
    ScatterFeature,
    SnapToSurfaceFeature,
} from "@bedfox/api/feature";
import { Query, Registry } from "@bedfox/api/registry";

new Query(Block).filter(
    Block.withComponent(GeometryBlockComponent),
);

const reg = new Registry("test");

const someSys = new Query(FeatureRules, ScatterFeature)
    // filter based on features being placed
    .filter(Feature.placing(SnapToSurfaceFeature))
    // upgrade to a system
    .system((_reg, fts) => {
        for (const ft of fts) {}
    });

reg.addSystem(someSys);

new Query(Definition)
    .filter(Definition.orphan());

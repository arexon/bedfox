import { Definition, type DefinitionCtor, type ReferenceTarget } from "#/common/index";
import type { Filter } from "#/registry";

/** A world generation feature; every `minecraft:*_feature` definition. */
export abstract class Feature extends Definition {
    /** Matches features that place `target` in the world. */
    static placing(target: DefinitionCtor | ReferenceTarget): Filter<Feature> {
        return (feature, reg) => feature._placements().some((ref) => reg.matches(ref, target));
    }

    /** Internal. Everything this feature places in the world. */
    _placements(): ReferenceTarget[] {
        return [];
    }

    /** Internal. Placements plus anything else referenced (e.g. replaceable blocks). */
    override _references(): ReferenceTarget[] {
        return this._placements();
    }
}

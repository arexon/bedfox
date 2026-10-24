import {
    Definition,
    type DefinitionCtor,
    type Reference,
    type ReferenceTarget,
} from "#/core/definition";
import type { Filter } from "#/registry";

export abstract class Feature extends Definition {
    /** Matches features that place `target` in the world. */
    static placing(target: DefinitionCtor | ReferenceTarget): Filter<Feature> {
        return (feature, reg) => feature._placements().some((ref) => reg.matches(ref, target));
    }

    /** Internal. Everything this feature places in the world. */
    _placements(): Reference[] {
        return [];
    }

    /** Internal. Placements plus anything else referenced (e.g. replaceable blocks). */
    override _references(): Reference[] {
        return this._placements();
    }
}

/** A feature, or the identifier of one. */
export type FeatureReference = string | Feature;

import type { InstanceProps } from "#/core/props";
import { serialize } from "#/core/serialize";

export type BiomeFilterTest =
    | "has_biome_tag"
    | "is_biome"
    | "is_snow_covered"
    | "is_humid"
    | "is_temperature_type"
    | "is_temperature_value";

export type BiomeFilterOperator = "==" | "!=";

@serialize
export class BiomeFilterSingle {
    test: BiomeFilterTest;

    /** @default "==" */
    operator: BiomeFilterOperator;

    value: string;

    constructor(test: BiomeFilterTest, operator: BiomeFilterOperator, value: string) {
        this.test = test;
        this.operator = operator;
        this.value = value;
    }
}

@serialize
export class BiomeFilterMulti {
    anyOf?: BiomeFilterSingle[];

    allOf?: BiomeFilterSingle[];

    constructor(props: InstanceProps<BiomeFilterMulti>) {
        Object.assign(this, props);
    }
}

export class BiomeFilter {
    #items: (BiomeFilterSingle | BiomeFilterMulti)[] = [];

    not(): this {
        return this;
    }

    hasTag(value: string): this {
        return this.#eq("has_biome_tag", value);
    }

    isBiome(value: string): this {
        return this.#eq("is_biome", value);
    }

    isSnowCovered(value = true): this {
        return this.#eq("is_snow_covered", value.toString());
    }

    isHumid(value = true): this {
        return this.#eq("is_humid", value.toString());
    }

    isTemperatureType(value: string): this {
        return this.#eq("is_temperature_type", value);
    }

    isTemperatureValue(value: string): this {
        return this.#eq("is_temperature_value", value);
    }

    allOf(callback: (b: BiomeFilter) => void): this {
        const inner = new BiomeFilter();
        callback(inner);
        this.#items.push(new BiomeFilterMulti({ allOf: inner.#singles() }));
        return this;
    }

    anyOf(callback: (b: BiomeFilter) => void): this {
        const inner = new BiomeFilter();
        callback(inner);
        this.#items.push(new BiomeFilterMulti({ anyOf: inner.#singles() }));
        return this;
    }

    toJSON(): unknown {
        return this.#items.length === 1 ? this.#items[0] : this.#items;
    }

    #eq(test: BiomeFilterTest, value: string): this {
        this.#items.push(new BiomeFilterSingle(test, "==", value));
        return this;
    }

    #singles(): BiomeFilterSingle[] {
        return this.#items.filter((item) => item instanceof BiomeFilterSingle);
    }
}

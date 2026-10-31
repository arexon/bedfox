import type { InstanceProps } from "#/core/props";
import { serialize } from "#/serialize";

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

export type BiomeFilterItem = BiomeFilterSingle | BiomeFilterMulti;

@serialize
export class BiomeFilterMulti {
    anyOf?: BiomeFilterItem[];

    allOf?: BiomeFilterItem[];

    constructor(props: InstanceProps<BiomeFilterMulti>) {
        Object.assign(this, props);
    }
}

export class BiomeFilterTests<R> {
    readonly #addTest: (test: BiomeFilterTest, value: string) => R;

    constructor(addTest: (test: BiomeFilterTest, value: string) => R) {
        this.#addTest = addTest;
    }

    hasTag(value: string): R {
        return this.#addTest("has_biome_tag", value);
    }

    isBiome(value: string): R {
        return this.#addTest("is_biome", value);
    }

    isSnowCovered(value = true): R {
        return this.#addTest("is_snow_covered", value.toString());
    }

    isHumid(value = true): R {
        return this.#addTest("is_humid", value.toString());
    }

    isTemperatureType(value: string): R {
        return this.#addTest("is_temperature_type", value);
    }

    isTemperatureValue(value: string): R {
        return this.#addTest("is_temperature_value", value);
    }
}

export class BiomeFilter extends BiomeFilterTests<BiomeFilter> {
    #items: BiomeFilterItem[] = [];

    constructor() {
        super((test, value) => this.#push(test, "==", value));
    }

    get not(): BiomeFilterTests<BiomeFilter> {
        return new BiomeFilterTests((test, value) => this.#push(test, "!=", value));
    }

    allOf(callback: (b: BiomeFilter) => void): this {
        const inner = new BiomeFilter();
        callback(inner);
        this.#items.push(new BiomeFilterMulti({ allOf: inner.#items }));
        return this;
    }

    anyOf(callback: (b: BiomeFilter) => void): this {
        const inner = new BiomeFilter();
        callback(inner);
        this.#items.push(new BiomeFilterMulti({ anyOf: inner.#items }));
        return this;
    }

    toJSON(): unknown {
        if (this.#items.length !== 1) return this.#items;
        // JSON.stringify() calls toJSON() once per value, so call the item's own toJSON() here.
        return (this.#items[0] as unknown as { toJSON(): unknown }).toJSON();
    }

    #push(test: BiomeFilterTest, operator: BiomeFilterOperator, value: string): this {
        this.#items.push(new BiomeFilterSingle(test, operator, value));
        return this;
    }
}

import { Ser } from "@bedfox/serialize";

export enum BiomeFilterTest {
    HasBiomeTag = "has_biome_tag",
    IsBiome = "is_biome",
    IsSnowCovered = "is_snow_covered",
    IsHumid = "is_humid",
    IsTemperatureType = "is_temperature_type",
    IsTemperatureValue = "is_temperature_value",
}

export enum BiomeFilterOperator {
    Eq = "==",
    NotEq = "!=",
}

@Ser()
export class BiomeFilterSingle {
    @Ser()
    test: BiomeFilterTest;

    @Ser({ default: () => BiomeFilterOperator.Eq })
    operator!: BiomeFilterOperator;

    @Ser()
    value: string;

    constructor(
        test: BiomeFilterTest,
        operator: BiomeFilterOperator,
        value: string,
    ) {
        this.test = test;
        this.operator = operator;
        this.value = value;
    }
}

@Ser()
export class BiomeFilterMulti {
    @Ser()
    anyOf?: BiomeFilterSingle[];

    @Ser()
    allOf?: BiomeFilterSingle[];

    constructor(props: BiomeFilterMulti) {
        Object.assign(this, props);
    }
}

export class BiomeFilter {
    #items: (BiomeFilterSingle | BiomeFilterMulti)[] = [];
    #negate = false;

    not(): this {
        this.#negate = true;
        return this;
    }

    hasTag(value: string): this {
        return this.#eq(BiomeFilterTest.HasBiomeTag, value);
    }

    isBiome(value: string): this {
        return this.#eq(BiomeFilterTest.IsBiome, value);
    }

    isSnowCovered(value = true): this {
        return this.#eq(BiomeFilterTest.IsSnowCovered, value.toString());
    }

    isHumid(value = true): this {
        return this.#eq(BiomeFilterTest.IsHumid, value.toString());
    }

    isTemperatureType(value: string): this {
        return this.#eq(BiomeFilterTest.IsTemperatureType, value);
    }

    isTemperatureValue(value: string): this {
        return this.#eq(BiomeFilterTest.IsTemperatureValue, value);
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
        this.#negate = false;
        this.#items.push(
            new BiomeFilterSingle(
                test,
                this.#negate
                    ? BiomeFilterOperator.NotEq
                    : BiomeFilterOperator.Eq,
                value,
            ),
        );
        return this;
    }

    #singles(): BiomeFilterSingle[] {
        return this.#items.filter((item) => item instanceof BiomeFilterSingle);
    }
}

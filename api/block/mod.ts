import { type BlockTrait, BlockTraitCollection } from "@bedfox/api/block";
import {
    type Component,
    ComponentCollection,
    Definition,
    type DefinitionProps,
    ItemCategory,
    Range,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";

export * from "./component/mod.ts";
export * from "./trait/mod.ts";

const PATH = "minecraft:block";

@Ser()
export class Block extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 40);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: `${PATH}/description` })
    traits: BlockTraitCollection = new BlockTraitCollection();

    @Ser({
        path: `${PATH}/description/menu_category`,
        default: () => ItemCategory.None,
    })
    category?: ItemCategory;

    @Ser({ path: `${PATH}/description/menu_category` })
    group?: string;

    @Ser({
        path: `${PATH}/description/menu_category`,
        default: () => false,
    })
    isHiddenInCommand?: boolean;

    @Ser({
        path: `${PATH}/description`,
        default: () => ({}),
        custom: (states) =>
            Object.fromEntries(
                Object.entries(states).map(([key, state]) => [
                    key,
                    state instanceof Range
                        ? Range.CUSTOM_SER.VALUES_OBJECT(state)
                        : state,
                ]),
            ),
    })
    states: Record<string, (number | boolean | string)[] | Range> = {};

    @Ser({ path: PATH })
    components: ComponentCollection = new ComponentCollection();

    @Ser({ path: PATH, default: () => [] })
    permutations: BlockPermutation[] = [];

    constructor(identifier: string, props?: DefinitionProps<Block>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    setState(name: string, ...number: number[]): this;
    setState(name: string, ...boolean: boolean[]): this;
    setState(name: string, ...string: string[]): this;
    setState(name: string, range: Range): this;
    setState(
        name: string,
        first: number | boolean | string | Range,
        ...rest: (number | boolean | string)[]
    ): this {
        this.states[name] = first instanceof Range ? first : [first, ...rest];
        return this;
    }

    deleteState(...names: string[]): this {
        for (const name of names) delete this.states[name];
        return this;
    }

    setTrait(...traits: BlockTrait[]): this {
        this.traits.set(...traits);
        return this;
    }

    deleteTrait(
        ...traitCtors: (abstract new (...args: never[]) => BlockTrait)[]
    ): this {
        this.traits.delete(...traitCtors);
        return this;
    }

    setComponent(...components: Component[]): this {
        this.components.set(...components);
        return this;
    }

    deleteComponent(
        ...componentCtors: (abstract new (...args: never[]) => Component)[]
    ): this {
        this.components.delete(...componentCtors);
        return this;
    }

    pushPermutation(
        condition: string,
        ...components: Component[]
    ): this {
        this.permutations.push(new BlockPermutation(condition, ...components));
        return this;
    }

    override _resolveInstances(): Definition[] {
        return [];
    }
}

@Ser()
export class BlockPermutation {
    @Ser()
    condition: string;

    @Ser({ default: () => new ComponentCollection() })
    components: ComponentCollection;

    constructor(condition: string, ...components: Component[]) {
        this.condition = condition;
        this.components = new ComponentCollection(...components);
    }
}

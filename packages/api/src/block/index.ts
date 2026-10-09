import { type BlockTrait, BlockTraitCollection } from "#/block/trait/base";
import { type Component, ComponentCollection, type ComponentCtor } from "#/core/component";
import { Definition, type DefinitionProps } from "#/core/definition";
import type { Filter } from "#/core/registry";
import { serialize } from "#/core/serialize";
import { FormatVersion, type ItemCategory, Range } from "#/primitive/index";

export * from "#/block/component/index";
export * from "#/block/trait/index";

@serialize
export class Block extends Definition.of("minecraft:block", new FormatVersion(1, 26, 40)) {
    override identifier: string;

    @serialize({ within: "description" })
    traits: BlockTraitCollection = new BlockTraitCollection();

    @serialize({ within: ["description", "menu_category"] })
    category?: ItemCategory;

    @serialize({ within: ["description", "menu_category"] })
    group?: string;

    @serialize({ within: ["description", "menu_category"] })
    isHiddenInCommands?: boolean;

    @serialize({ within: "description", keepKeys: true, override: serStates })
    states: Record<string, (number | boolean | string)[] | Range> = {};

    components: ComponentCollection = new ComponentCollection();

    permutations: BlockPermutation[] = [];

    constructor(identifier: string, props?: DefinitionProps<Block>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    /** Matches blocks that have every given component. */
    static withComponent(first: ComponentCtor, ...rest: ComponentCtor[]): Filter<Block> {
        return (block) => block.components.has(first, ...rest);
    }

    /** Matches blocks that have none of the given components. */
    static withoutComponent(first: ComponentCtor, ...rest: ComponentCtor[]): Filter<Block> {
        const ctors = [first, ...rest];
        return (block) => !ctors.some((ctor) => block.components.has(ctor));
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

    deleteTrait(...traitCtors: (abstract new (...args: never[]) => BlockTrait)[]): this {
        this.traits.delete(...traitCtors);
        return this;
    }

    setComponent(...components: Component[]): this {
        this.components.set(...components);
        return this;
    }

    deleteComponent(...componentCtors: (abstract new (...args: never[]) => Component)[]): this {
        this.components.delete(...componentCtors);
        return this;
    }

    pushPermutation(condition: string, ...components: Component[]): this {
        this.permutations.push(new BlockPermutation(condition, ...components));
        return this;
    }
}

/** States as `{ name: values }`, with ranges as `{ values: { min, max } }`. */
function serStates(states?: Block["states"]): unknown {
    let out: Record<string, unknown> | undefined = undefined;
    for (const [name, state] of Object.entries(states ?? {})) {
        out ??= {};
        out[name] = state instanceof Range ? state.toValuesObject() : state;
    }
    return out;
}

@serialize
export class BlockPermutation {
    condition: string;

    components: ComponentCollection;

    constructor(condition: string, ...components: Component[]) {
        this.condition = condition;
        this.components = new ComponentCollection(...components);
    }
}

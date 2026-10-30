import { type BlockTrait, BlockTraitCollection } from "#/block/trait/base";
import type { BRAND } from "#/core/brand";
import { type Component, ComponentCollection } from "#/core/component";
import { Definition, type DefinitionLocation, type DefinitionProps } from "#/core/definition";
import { FormatVersion, type ItemCategory, Range } from "#/primitive/index";
import { serialize } from "#/serialize";

export * from "#/block/component/index";
export * from "#/block/trait/index";

const ROOT = "minecraft:block";

@serialize
export class Block extends Definition {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 40);
    static override readonly location: DefinitionLocation = { kind: "behavior", folder: "blocks" };

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: [ROOT, "description"] })
    traits: BlockTraitCollection = new BlockTraitCollection();

    @serialize({ within: [ROOT, "description", "menu_category"] })
    category?: ItemCategory;

    @serialize({ within: [ROOT, "description", "menu_category"] })
    group?: string;

    @serialize({ within: [ROOT, "description", "menu_category"] })
    isHiddenInCommands?: boolean;

    @serialize({ within: [ROOT, "description"], keepKeys: true, override: serStates })
    states: Record<string, (number | boolean | string)[] | Range> = {};

    @serialize({ within: ROOT })
    components: ComponentCollection = new ComponentCollection();

    @serialize({ within: ROOT })
    permutations: BlockPermutation[] = [];

    constructor(identifier: string, props?: DefinitionProps<Block>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    setState(name: string, firstNumber: number, ...restNumber: number[]): this;
    setState(name: string, firstBoolean: boolean, ...restBoolean: boolean[]): this;
    setState(name: string, firstString: string, ...restString: string[]): this;
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

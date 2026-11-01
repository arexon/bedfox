import { Entry, type Reference } from "#/entry";
import type { EmitContext, Emitted, PackKind } from "#/output";
import { Resource } from "#/resource";
import { serialize, toJson } from "#/serialize";

abstract class Named extends Entry {
    declare static readonly folder: string;

    @serialize({ override: (_, entry: Named, ctx) => entry.toReference(ctx) })
    readonly identifier!: string;

    static override normalizeKey(key: string, namespace: string): string {
        const prefix = `${namespace}:`;
        return key.startsWith(prefix) ? key.slice(prefix.length) : key;
    }

    get kind(): PackKind {
        return "behavior";
    }

    get path(): string {
        return `${(this.constructor as typeof Named).folder}/${this.identifier}.json`;
    }

    key(): string {
        return this.identifier;
    }

    emit(ctx: EmitContext): Emitted {
        return { format: "json", value: toJson(this, ctx) };
    }

    override toReference(ctx?: EmitContext): string {
        return ctx === undefined ? this.identifier : `${ctx.namespace}:${this.identifier}`;
    }
}

@serialize
export class Leaf extends Named {
    static override readonly folder = "leaves";

    @serialize({ within: ["test:leaf", "description"] })
    override readonly identifier: string;

    constructor(identifier: string) {
        super();
        this.identifier = identifier;
    }
}

export abstract class Branch extends Named {
    static override readonly folder = "branches";

    links: (Branch | string)[] = [];

    leaves: (Leaf | string)[] = [];

    override references(): Reference[] {
        return [
            ...this.links.map((target) => ({ ctor: Branch, target })),
            ...this.leaves.map((target) => ({ ctor: Leaf, target })),
        ];
    }
}

@serialize
export class Node extends Branch {
    @serialize({ within: ["test:node", "description"] })
    override readonly identifier: string;

    constructor(identifier: string, props?: Partial<Pick<Node, "links" | "leaves">>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }
}

@serialize
export class Twig extends Branch {
    @serialize({ within: ["test:twig", "description"] })
    override readonly identifier: string;

    constructor(identifier: string) {
        super();
        this.identifier = identifier;
    }
}

@serialize
export class Custom extends Named {
    static override readonly folder = "custom";

    @serialize({ within: ["test:custom", "description"] })
    override readonly identifier: string;

    constructor(identifier: string) {
        super();
        this.identifier = identifier;
    }
}

export class Notes extends Resource {
    lines: string[] = [];

    get kind(): PackKind {
        return "resource";
    }

    get path(): string {
        return "notes.txt";
    }

    emit(): Emitted {
        return { format: "text", value: this.lines.join("\n") };
    }

    override isEmpty(): boolean {
        return this.lines.length === 0;
    }
}

export class Clash extends Resource {
    get kind(): PackKind {
        return "behavior";
    }

    get path(): string {
        return "custom/clash.json";
    }

    emit(): Emitted {
        return { format: "json", value: {} };
    }
}

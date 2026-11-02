import {
    describeSystem,
    ORDER,
    type Order,
    OrderedSystem,
    type PreparedSystem,
    type System,
} from "#/system";

/** When a system runs: `setup`, then `transform`, then `finalize`. */
export type Schedule = "setup" | "transform" | "finalize";

export interface ScheduledSystem {
    schedule: Schedule;
    index: number;
    plugins: readonly string[];
    system: System | PreparedSystem<unknown>;
}

interface AddedSystem extends Order {
    readonly plugins: readonly string[];
}

const NO_SYSTEMS: ReadonlySet<System | PreparedSystem<unknown>> = new Set();

export class Schedules {
    static readonly default: Schedule = "transform";

    #schedules: readonly Schedule[] = ["setup", "transform", "finalize"];
    #systems = new Map<Schedule, AddedSystem[]>();

    add(
        schedule: Schedule,
        systems: readonly (System | PreparedSystem<unknown> | OrderedSystem)[],
        plugins: readonly string[],
    ): void {
        const list = this.#systems.get(schedule) ?? [];
        for (const system of systems) {
            list.push(
                system instanceof OrderedSystem
                    ? { ...system[ORDER](), plugins }
                    : {
                          system,
                          after: NO_SYSTEMS,
                          before: NO_SYSTEMS,
                          position: undefined,
                          plugins,
                      },
            );
        }
        this.#systems.set(schedule, list);
    }

    copy(): Schedules {
        const copy = new Schedules();
        for (const [schedule, list] of this.#systems) copy.#systems.set(schedule, [...list]);
        return copy;
    }

    list(): ScheduledSystem[] {
        return this.#schedules.flatMap((schedule) =>
            sort(schedule, this.#systems.get(schedule) ?? []).map(({ system, plugins }, index) => ({
                schedule,
                index,
                plugins,
                system,
            })),
        );
    }
}

function sort(schedule: Schedule, systems: readonly AddedSystem[]): AddedSystem[] {
    // `next[i]` holds the indexes of the systems that must run after system `i`.
    const next = systems.map(() => new Set<number>());
    const indexesOf = (target: System | PreparedSystem<unknown>): number[] =>
        systems.flatMap(({ system }, i) => (system === target ? [i] : []));
    for (const [i, a] of systems.entries()) {
        for (const [j, b] of systems.entries()) {
            if (i === j) continue;
            if (a.position === "first" && b.position !== "first") next[i].add(j);
            if (a.position !== "last" && b.position === "last") next[i].add(j);
        }
        for (const target of a.after)
            for (const j of indexesOf(target)) if (j !== i) next[j].add(i);
        for (const target of a.before)
            for (const j of indexesOf(target)) if (j !== i) next[i].add(j);
    }

    const incoming = systems.map(() => 0);
    for (const targets of next) for (const j of targets) incoming[j]++;
    const order: number[] = [];
    const done = new Set<number>();
    while (order.length < systems.length) {
        const ready = systems.findIndex((_, i) => !done.has(i) && incoming[i] === 0);
        if (ready === -1) {
            const remaining = systems
                .keys()
                .filter((i) => !done.has(i))
                .toArray();
            const cycle = findCycle(next, remaining).map((i) =>
                describeSystem(systems[i].system, {
                    schedule,
                    index: i,
                    plugins: systems[i].plugins,
                }),
            );
            throw new SystemOrderCycleError(cycle);
        }
        order.push(ready);
        done.add(ready);
        for (const j of next[ready]) incoming[j]--;
    }
    return order.map((i) => systems[i]);
}

function findCycle(next: readonly ReadonlySet<number>[], remaining: readonly number[]): number[] {
    const path: number[] = [];
    let current = remaining[0];
    while (!path.includes(current)) {
        path.push(current);
        const node = current;
        current = remaining.find((i) => next[i].has(node)) ?? node;
    }
    return path.slice(path.indexOf(current)).toReversed();
}

/**
 * Thrown by {@link Project.run} when the order rules of the systems in one schedule form a cycle.
 *
 * The message names the systems in the cycle, in the order that the rules ask for.
 */
export class SystemOrderCycleError extends Error {
    constructor(systems: readonly string[]) {
        const chain = [...systems, systems[0]];
        const steps = chain
            .slice(1)
            .map((system, i) => `${i === 0 ? " runs" : ", which runs"} before ${system}`);
        super(`The order rules of these systems form a cycle: ${chain[0]}${steps.join("")}`);
        this.name = "SystemOrderCycleError";
    }
}

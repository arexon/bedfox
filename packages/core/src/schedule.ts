import type { ChainStep, Detail, Diagnostic } from "#/diagnostic";
import type { Plugin } from "#/plugin";
import {
    ORDER,
    type Order,
    OrderedSystem,
    type PreparedSystem,
    ScheduledSystem,
    type System,
    UNNAMED_HELP,
} from "#/system";

/** When a system runs: `setup`, then `transform`, then `finalize`. */
export type Schedule = "setup" | "transform" | "finalize";

interface AddedSystem extends Order {
    readonly plugins: readonly Plugin[];
}

const NO_SYSTEMS: ReadonlySet<System | PreparedSystem<unknown>> = new Set();

export class Schedules {
    static readonly default: Schedule = "transform";

    #schedules: readonly Schedule[] = ["setup", "transform", "finalize"];
    #systems = new Map<Schedule, AddedSystem[]>();

    add(
        schedule: Schedule,
        systems: readonly (System | PreparedSystem<unknown> | OrderedSystem)[],
        plugins: readonly Plugin[],
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

    list(): { systems: ScheduledSystem[]; cycles: SystemOrderCycle[] } {
        const systems: ScheduledSystem[] = [];
        const cycles: SystemOrderCycle[] = [];
        for (const schedule of this.#schedules) {
            const sorted = sort(schedule, this.#systems.get(schedule) ?? []);
            if (Array.isArray(sorted)) systems.push(...sorted);
            else cycles.push(sorted);
        }
        return { systems, cycles };
    }
}

function sort(
    schedule: Schedule,
    added: readonly AddedSystem[],
): ScheduledSystem[] | SystemOrderCycle {
    const systems = added.map(
        ({ system, plugins }, index) => new ScheduledSystem(system, schedule, index, plugins),
    );
    // `next[i]` maps each system that must run after system `i` to the first rule that says so.
    const next = added.map(() => new Map<number, OrderRule>());
    const link = (from: number, to: number, rule: OrderRule): void => {
        if (from !== to && !next[from].has(to)) next[from].set(to, rule);
    };
    const indexesOf = (target: System | PreparedSystem<unknown>): number[] =>
        added.flatMap(({ system }, i) => (system === target ? [i] : []));
    // Link the explicit rules first, so that a cycle names them before afterAll() and beforeAll().
    for (const [i, a] of added.entries()) {
        for (const target of a.after) for (const j of indexesOf(target)) link(j, i, "after");
        for (const target of a.before) for (const j of indexesOf(target)) link(i, j, "before");
    }
    for (const [i, a] of added.entries()) {
        for (const [j, b] of added.entries()) {
            if (a.position === "first" && b.position !== "first") link(i, j, "beforeAll");
            if (a.position !== "last" && b.position === "last") link(i, j, "afterAll");
        }
    }

    const incoming = added.map(() => 0);
    for (const targets of next) for (const j of targets.keys()) incoming[j]++;
    const order: number[] = [];
    const done = new Set<number>();
    while (order.length < added.length) {
        const ready = added.findIndex((_, i) => !done.has(i) && incoming[i] === 0);
        if (ready === -1) {
            const remaining = added
                .keys()
                .filter((i) => !done.has(i))
                .toArray();
            const cycle = findCycle(next, remaining);
            return new SystemOrderCycle(
                schedule,
                cycle.map((i, k) => ({
                    system: systems[i],
                    rule: next[i].get(cycle[(k + 1) % cycle.length]) as OrderRule,
                })),
            );
        }
        order.push(ready);
        done.add(ready);
        for (const j of next[ready].keys()) incoming[j]--;
    }
    return order.map((i) => systems[i]);
}

function findCycle(
    next: readonly ReadonlyMap<number, OrderRule>[],
    remaining: readonly number[],
): number[] {
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
 * The order rule that makes a system run before another system.
 *
 * - `after`: the other system uses `after()` with this system.
 * - `before`: this system uses `before()` with the other system.
 * - `afterAll`: the other system uses `afterAll()`.
 * - `beforeAll`: this system uses `beforeAll()`.
 */
export type OrderRule = "after" | "before" | "afterAll" | "beforeAll";

/** A system in a {@link SystemOrderCycle}. */
export interface OrderStep {
    /** The system. */
    readonly system: ScheduledSystem;
    /** The rule that makes the system run before the next system of the cycle. */
    readonly rule: OrderRule;
}

/**
 * Reported by {@link Project.run} when the order rules of the systems in one schedule form a cycle.
 *
 * The run reports one cycle for each schedule that has one.
 */
export class SystemOrderCycle implements Diagnostic {
    readonly severity = "error";
    readonly code = SystemOrderCycle.name;
    readonly title: string;
    readonly details: readonly Detail[];
    readonly help?: string;
    /** The schedule of the systems. */
    readonly schedule: Schedule;
    /**
     * The systems of the cycle, in the order that the rules ask for. The last system runs before
     * the first.
     */
    readonly cycle: readonly OrderStep[];

    constructor(schedule: Schedule, cycle: readonly OrderStep[]) {
        const steps: ChainStep[] = [{ text: cycle[0].system.label }];
        for (const [i, step] of cycle.entries()) {
            const later = cycle[(i + 1) % cycle.length].system;
            steps.push({ text: later.label, note: SystemOrderCycle.#ruleNote(step, later) });
        }
        this.title = `Systems on ${schedule} form an order cycle`;
        this.details = [{ kind: "chain", steps }];
        if (cycle.some(({ system }) => system.name === undefined)) this.help = UNNAMED_HELP;
        this.schedule = schedule;
        this.cycle = cycle;
    }

    static #ruleNote({ system, rule }: OrderStep, later: ScheduledSystem): string {
        const earlier = system.label;
        const next = later.label;
        const notes: Record<OrderRule, string> = {
            after: `${next} uses after(${earlier})`,
            before: `${earlier} uses before(${next})`,
            afterAll: `${next} uses afterAll()`,
            beforeAll: `${earlier} uses beforeAll()`,
        };
        return notes[rule];
    }
}

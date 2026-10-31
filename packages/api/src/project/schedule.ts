import type { PreparedSystem, System } from "#/project/system";

/** When a system runs: `setup`, then `transform`, then `finalize`. */
export type Schedule = "setup" | "transform" | "finalize";

export interface ScheduledSystem {
    schedule: Schedule;
    index: number;
    plugins: readonly string[];
    system: System | PreparedSystem<unknown>;
}

export class Schedules {
    static readonly default: Schedule = "transform";

    #schedules: readonly Schedule[] = ["setup", "transform", "finalize"];
    #systems = new Map<Schedule, Pick<ScheduledSystem, "system" | "plugins">[]>();

    add(
        schedule: Schedule,
        systems: readonly (System | PreparedSystem<unknown>)[],
        plugins: readonly string[],
    ): void {
        const list = this.#systems.get(schedule) ?? [];
        list.push(...systems.map((system) => ({ system, plugins })));
        this.#systems.set(schedule, list);
    }

    copy(): Schedules {
        const copy = new Schedules();
        for (const [schedule, list] of this.#systems) copy.#systems.set(schedule, [...list]);
        return copy;
    }

    list(): ScheduledSystem[] {
        return this.#schedules.flatMap((schedule) =>
            (this.#systems.get(schedule) ?? []).map(({ system, plugins }, index) => ({
                schedule,
                index,
                plugins,
                system,
            })),
        );
    }
}

export function describePlugins(plugins: readonly string[]): string {
    return plugins.toReversed().join(" in ");
}

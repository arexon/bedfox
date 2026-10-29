import type { PreparedSystem, System } from "#/project/project";

/** When a system runs: `setup`, then `transform`, then `finalize`. */
export type Schedule = "setup" | "transform" | "finalize";

export interface ScheduledSystem {
    schedule: Schedule;
    index: number;
    plugins: readonly string[];
    system: System | PreparedSystem<unknown>;
}

export class Schedules {
    readonly default: Schedule = "transform";

    #schedules: readonly Schedule[] = ["setup", "transform", "finalize"];
    #systems = new Map<Schedule, Pick<ScheduledSystem, "system" | "plugins">[]>();

    add(
        schedule: Schedule,
        systems: (System | PreparedSystem<unknown>)[],
        plugins: readonly string[],
    ): void {
        const list = this.#systems.get(schedule) ?? [];
        list.push(...systems.map((system) => ({ system, plugins })));
        this.#systems.set(schedule, list);
    }

    size(schedule: Schedule): number {
        return this.#systems.get(schedule)?.length ?? 0;
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

import type { PreparedSystem, System } from "#/project/project";

/** When a system runs: `setup`, then `transform`, then `finalize`. */
export type Schedule = "setup" | "transform" | "finalize";

/** A system, with the place it runs. */
export interface ScheduledSystem {
    schedule: Schedule;
    /** The system's position in its schedule, from 0. */
    index: number;
    /** The names of the plugins that added the system, outermost first. */
    plugins: readonly string[];
    system: System | PreparedSystem<unknown>;
}

/** Holds a project's systems, grouped by schedule. */
export class Schedules {
    /** The schedule for systems added without one. */
    readonly default: Schedule = "transform";

    /** The schedules in run order. */
    #schedules: readonly Schedule[] = ["setup", "transform", "finalize"];
    #systems = new Map<Schedule, Pick<ScheduledSystem, "system" | "plugins">[]>();

    /** Adds systems to the end of `schedule`, from the given plugins, outermost first. */
    add(
        schedule: Schedule,
        systems: (System | PreparedSystem<unknown>)[],
        plugins: readonly string[],
    ): void {
        const list = this.#systems.get(schedule) ?? [];
        list.push(...systems.map((system) => ({ system, plugins })));
        this.#systems.set(schedule, list);
    }

    /** The number of systems on `schedule`. */
    size(schedule: Schedule): number {
        return this.#systems.get(schedule)?.length ?? 0;
    }

    /**
     * Each system, schedule by schedule, in the order that `add()` added them. Later calls to
     * `add()` don't change the returned list.
     */
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

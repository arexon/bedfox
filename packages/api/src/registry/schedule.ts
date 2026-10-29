import type { System } from "#/registry/index";

/** When a system runs: `setup`, then `transform`, then `finalize`, then `build`. */
export type Schedule = "setup" | "transform" | "finalize" | "build";

/** Holds a registry's systems, grouped by schedule. */
export class Schedules {
    /** The schedule for systems added without one. */
    readonly default: Schedule = "transform";

    /** The schedules in run order. */
    #schedules: readonly Schedule[] = ["setup", "transform", "finalize", "build"];
    #systems = new Map<Schedule, System[]>();

    /** Adds systems to the end of `schedule`. */
    add(schedule: Schedule, systems: System[]): void {
        const list = this.#systems.get(schedule) ?? [];
        list.push(...systems);
        this.#systems.set(schedule, list);
    }

    /**
     * @yields Each system, schedule by schedule, in the order that `add()` added them. It includes
     *   systems added during iteration to the current schedule or a later one.
     */
    *systems(): Generator<System, void, unknown> {
        for (const schedule of this.#schedules) {
            yield* this.#systems.get(schedule) ?? [];
        }
    }
}

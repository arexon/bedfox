/** An error caused by a system that threw, or by a `prepare` step that rejected. */
export class SystemFailedError extends Error {
    constructor(system: string, part: "prepare" | "run", cause: unknown) {
        super(`${system} failed in ${part}`, { cause });
        this.name = "SystemFailedError";
    }
}

/** An error caused by an `async` system, or by a system that returned a promise. */
export class AsyncSystemError extends TypeError {
    /** @param problem - What is async, e.g. `System 0 on setup is async`. */
    constructor(problem: string) {
        super(
            `${problem}. Systems must be sync, so move async work into the prepare step of a prepared system`,
        );
        this.name = "AsyncSystemError";
    }
}

/** An error caused by starting a run while another run of the same project is active. */
export class RunInProgressError extends Error {
    constructor() {
        super("Can't start a run while another run of this project is active");
        this.name = "RunInProgressError";
    }
}

/** An error caused by adding a system while the project runs. */
export class SystemAddedDuringRunError extends Error {
    constructor() {
        super("Can't add systems while the project runs. Add them before run()");
        this.name = "SystemAddedDuringRunError";
    }
}

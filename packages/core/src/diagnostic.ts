/**
 * How serious a {@link Diagnostic} is.
 *
 * - `error`: the run fails.
 * - `warning`: the run continues. {@link FrozenRegistry.warnings} holds the warning.
 */
export type Severity = "error" | "warning";

/**
 * A problem that {@link Project.run} found, or that a system reported with {@link Registry.report}.
 *
 * A diagnostic is plain data that a tool can print in its own format. The problems that the run
 * finds are classes with more fields, e.g. {@link SystemFailed}. These fields hold the objects that
 * the problem is about, such as the system function or the plugin instances. `code` tells the kinds
 * apart.
 *
 * @example
 *     class UnusedFile implements Diagnostic {
 *         readonly severity = "warning";
 *         readonly code = UnusedFile.name;
 *         readonly title: string;
 *         readonly help = "Remove the file, or point to it from another file";
 *         readonly file: PackOutput;
 *
 *         constructor(file: PackOutput) {
 *             this.title = `Nothing uses ${file.path}`;
 *             this.file = file;
 *         }
 *     }
 */
export interface Diagnostic {
    /** How serious the problem is. */
    readonly severity: Severity;
    /** The kind of problem, e.g. `SystemFailed`. */
    readonly code?: string;
    /** One line that tells what the problem is. */
    readonly title: string;
    /** More data about the problem, in order. */
    readonly details?: readonly Detail[];
    /** A line that tells how to fix the problem. */
    readonly help?: string;
    /** The value that caused the problem, e.g. the error that a system threw. */
    readonly cause?: unknown;
}

/**
 * A part of the details of a {@link Diagnostic}.
 *
 * - `field`: a label and its value, e.g. `schedule` and `setup (#0)`.
 * - `chain`: a list of steps, where each step follows the one before it.
 */
export type Detail =
    | { readonly kind: "field"; readonly label: string; readonly value: string }
    | { readonly kind: "chain"; readonly steps: readonly ChainStep[] };

/** A step of a `chain` {@link Detail}. */
export interface ChainStep {
    /** What the step is. */
    readonly text: string;
    /** Why the step follows the step before it. */
    readonly note?: string;
}

/**
 * Thrown by {@link Project.run} when the run fails.
 *
 * The message has one line for each diagnostic, with its severity, code and title. If the cause is
 * an error or a string, the line ends with its message. `errors` holds the causes of the errors, so
 * that an uncaught error shows their stacks.
 */
export class RunFailedError extends AggregateError {
    /** The errors that made the run fail, and the warnings of the run, in the order they came. */
    readonly diagnostics: readonly Diagnostic[];

    constructor(diagnostics: readonly Diagnostic[]) {
        const causes = diagnostics
            .filter(({ severity, cause }) => severity === "error" && cause !== undefined)
            .map(({ cause }) => cause);
        super(
            causes,
            [
                "The run failed:",
                ...diagnostics.map((diagnostic) => `  ${RunFailedError.#line(diagnostic)}`),
            ].join("\n"),
        );
        this.name = "RunFailedError";
        this.diagnostics = diagnostics;
    }

    static #line({ severity, code, title, cause }: Diagnostic): string {
        const head =
            code === undefined ? `${severity}: ${title}` : `${severity}[${code}]: ${title}`;
        if (cause instanceof Error) return `${head}: ${cause.message}`;
        if (typeof cause === "string") return `${head}: ${cause}`;
        return head;
    }
}

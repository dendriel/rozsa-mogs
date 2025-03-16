/**
 * Required checks and actions in the life-cycle of a command.
 * @typeParam Context - The type of the context object.
 *
 * Life-cycle:
 * 1. The command is enqueued via enqueue(), but keeps waiting for the next loop iteration.
 * 2. At the beginning of the loop iteration, the enqueued commands are initialized via `initialize()` and moved to
 * the command's backlog.
 * 3. Before being processed, `isInvalid()` is called to check if the command is still valid. If not, `onInvalidated()`
 * is called and the command is discarded.
 * 4. If the command is valid, `isReady()` is called to check if the command should be executed in this iteration.
 * 5. If the command is ready, `executed()` is called to handle the command execution and the command is removed from
 * the backlog.
 *
 * If any error occurs inside the loop iteration, the command is considered buggy and it is discarded to avoid blocking
 * the game-loop.
 */
export interface GameCommand<Context> {
    /**
     * Setup the command state inside the game-loop in the beginning of a loop iteration.
     * @param context the game context provided while starting the game loop.
     */
    initialize(context: Context): void;

    /**
     * The command is invalid or became invalid before execution.
     * @param context the game context provided while starting the game loop.
     * @return true if the command is invalid and must be discarded; false otherwise.
     */
    isInvalid(context: Context): boolean;

    /**
     * Callback to be called if the command was found invalid.
     * @param context the game context provided while starting the game loop.
     */
    onInvalidated(context: Context): void;

    /**
     * Check if the command is ready for execution.
     * @param context the game context provided while starting the game loop.
     * @return true if the command should be executed in the current iteration; false otherwise.
     */
    isReady(context: Context): boolean;

    /**
     * Execute the command.
     * @param context the game context provided while starting the game loop.
     */
    execute(context: Context): void;
}
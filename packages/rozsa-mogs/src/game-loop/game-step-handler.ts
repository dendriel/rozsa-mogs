/**
 * Handles a game step.
 * @typeParam Context - The type of the context object.
 */
export interface GameStepHandler<Context> {
    /**
     * @param context the game context provided while starting the game loop.
     */
    (context: Context): void;
}
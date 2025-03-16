/**
 * Handlers the game over.
 * @template Context - The type of the context object.
 */
export interface GameOverHandler<Context> {
    /**
     * @param context to be passed to the handler.
     * @param context the game context provided while starting the game loop.
     * @return true if the game has finished; false otherwise.
     */
    (context: Context): boolean;
}
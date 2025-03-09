
/**
 * Active connection info payload.
 */
export interface ConnectionInfo {
    /**
     * The payload should provide at least the token information.
     */
    token(): string;
}
/**
 * Game-client actions to handle received network events.
 */
export interface GameClient {

    /**
     * Received a command from the server.
     * @param cmd the command used.
     * @param payload the data received from the server's connection.
     */
    onCommand(cmd: string, payload: any): void;

    /**
     * The client has disconnected from (or lost connection to) the server.
     * @param reason disconnection reason.
     */
    onDisconnection(reason: string): void;

    /**
     * Failed to connect to the server.
     * @param error The error occurred while connecting.
     */
    onConnectError(error: Error): void;
}
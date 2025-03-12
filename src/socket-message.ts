/**
 * Represents a message in the network-server level.
 */
export class SocketMessage {
    /**
     * Creates a new socket message.
     * @param command the game-server command.
     * @param payload the message payload.
     */
    constructor(public command: string, public payload: any) {}
}
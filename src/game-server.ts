import {ActiveConnection} from "./active-connection";

/**
 * Game-server actions to handle received network events.
 */
export interface GameServer {
    /**
     * A new player has connected to the server.
     * @param conn the connection containing player information.
     */
    onConnection(conn: ActiveConnection): void;

    /**
     * A player has disconnected from (or lost connection to) the server.
     * @param conn the connection containing player information.
     */
    onDisconnection(conn: ActiveConnection): void;

    /**
     * Received a command from a connected player.
     * @param conn the connection containing player information.
     * @param cmd the command used.
     * @param payload the data received from the player's client connection.
     */
    onCommand(conn: ActiveConnection, cmd: string, payload: any): void;
}
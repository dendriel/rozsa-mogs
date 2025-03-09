import { Server } from 'socket.io';
import { Socket } from "socket.io/dist/socket";
import { IncomingMessage } from 'http';

/**
 * Active connection info payload.
 */
export interface ConnectionInfo {
    /**
     * The payload should provide at least the token information.
     */
    token(): string;
}

/**
 * Represents the connected player.
 */
export class ActiveConnection {
    /**
     * Create a new ActiveConnection.
     * @param _socket network socket related to this connection.
     * @param _info custom info payload.
     */
    constructor(private _socket: Socket, private _info: ConnectionInfo) {}
    get socket() { return this._socket; }
    get info() { return this._info; }
}

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

/**
 * Represents a message in the network-server level.
 */
class SocketMessage {
    /**
     * Creates a new socket message.
     * @param command the game-server command.
     * @param payload the message payload.
     */
    constructor(public command: string, public payload: any) {}
}

const NETWORK_CMD: string = 'netw-server-cmd';

export class NetworkServer {
    // key: token, object: user-info
    _expectedConnections: Map<string, ConnectionInfo>;
    // key: socket-id, object: user-info
    _activeConnections: Map<string, ActiveConnection>;

    constructor(private io: Server, private gameServer: GameServer) {
        this._expectedConnections = new Map();
        this._activeConnections = new Map();

        this.io.use((socket, next) => this.authenticationFilter(socket, next)); // TODO: no bind required?
        this.io.on('connection', (socket) => this.onConnection(socket));
    }

    get expectedConnections(): ConnectionInfo[] {
        return [...this._expectedConnections.values()];
    }

    get activeConnections(): ActiveConnection[] {
        return [...this._activeConnections.values()];
    }

    private getActiveConnectionByToken(token: string): ActiveConnection | undefined {
        assertValidString(token, "token");

        // TODO: to avoid looping everytime, we can create an ActivityConnectionHolder to map the conns both to socketId and token.
        // unless this is used only while connection, in which case wouldn't have a big impact.
        return Array.from(this.activeConnections.values()).find(conn => conn.info.token() === token);
    }

    /**
     * Add an expected connection to this server.
     * @param token the authentication token to be used (expected in the URLs query parameters).
     * @param data the player information.
     */
    addExpectedConnection(data: ConnectionInfo) {
        assertValidString(data.token(), "token");
        this._expectedConnections.set(data.token(), data);
    }

    private removeExpectedConnection(token: string) {
        assertValidString(token, "token");
        this._expectedConnections.delete(token);
    }

    private addActiveConnection(socketId: string, conn: ActiveConnection) {
        this._activeConnections.set(socketId, conn);
    }

    private removeActiveConnection(socketId: string) {
        this._activeConnections.delete(socketId);
    }

    getActiveConnection(socketId: string): ActiveConnection | undefined {
        return this._activeConnections.get(socketId);
    }


    private isConnectionExpected(token: string): boolean {
        return this._expectedConnections.has(token);
    }

    private authenticationFilter(socket: Socket, next: any) {
        let token = this.getParam('token', socket.request);

        if (!this.isConnectionExpected(token)) {
            console.log("DENIED unauthorized incoming connection with token: ", token);
            next(new Error('Not authorized'));
            return;
        }

        console.log("ACCEPTED incoming connection with token: ", token);

        next();
    }

    private getParam(name: string, req: IncomingMessage): string {
        const url = new URL(req.url!, `http://${req.headers.host}`); // TODO: what happens if it is https?

        const param = url.searchParams.get(name);
        return param ?? '';
    }

    /**
     * Handle a new connection. *The token was already validated inside the authenticationFilter.
     * @param socket
     * @private
     */
    private onConnection(socket: Socket) {
        let token = this.getParam('token', socket.request);
        let info = this._expectedConnections.get(token);

        let conn = new ActiveConnection(socket, info!);
        this.addActiveConnection(socket.id, conn);

        this.removeExpectedConnection(token);

        socket.on('disconnect', (reason) => this.onDisconnection(reason, conn));
        socket.on(NETWORK_CMD, (payload: SocketMessage) => this.onCommand(conn, payload));

        console.log("New connection received with token: ", token);

        this.gameServer.onConnection(conn);
    }

    private onDisconnection(reason: string, conn: any) {
        if (!conn) {
            console.log("Unknown player has disconnected!");
            return;
        }

        console.log(`Connection with token: ${conn.info.token()} has disconnected. Reason: ${reason}`);

        this.removeActiveConnection(conn.socket.id);
        this.gameServer.onDisconnection(conn);
    }

    private onCommand(conn: ActiveConnection, msg: SocketMessage) {
        this.gameServer.onCommand(conn, msg.command, msg.payload);
    }

    /**
     * Send a message to all players.
     * @param command the command identifier.
     * @param payload the message payload.
     */
    broadcast(command: string, payload: any) {
        const msg = new SocketMessage(command, payload);
        this.io.local.emit(NETWORK_CMD, msg);
    }

    /**
     * Send a message to a specific player.
     * @param token the connection token which identifies the target player.
     * @param command the command identifier.
     * @param payload the message payload.
     */
    send(token: string, command: string, payload: any) {
        assertValidString(token, "token");
        let conn = this.getActiveConnectionByToken(token);
        if (!conn) {
            console.log(`Player with token "${token}" is not connected!`);
            return;
        }

        const msg = new SocketMessage(command, payload);
        conn.socket.emit(NETWORK_CMD, msg);
    }

    /**
     * Closes the network server and releases the connections.
     */
    async terminate() {
        console.log("Network server is terminating...");

        await this.io.close();

        this.activeConnections.forEach(c => {
            console.log(`Delete connection with token ${c.info.token}`);
            c.socket.disconnect();
        });

        console.log("Websocket server is terminated.");
    }
}

function assertValidString(value: string, varName: string) {
    if (!value) {
        throw new Error(`${varName} must be a non-empty string.`);
    }
}
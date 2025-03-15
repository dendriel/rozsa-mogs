import {Server, Socket} from 'socket.io';
import http from 'http';
import express from 'express';
import socketio from 'socket.io';
import {IncomingMessage} from 'http';
import {ConnectionInfo} from "./connection-info";
import {ActiveConnection} from "./active-connection";
import {GameServer} from "./game-server";
import {SocketMessage} from "./socket-message";
import {NETWORK_EVENTS} from "./constants";

export class NetworkServer {
    // key: token, object: user-info
    _expectedConnections: Map<string, ConnectionInfo>;
    // key: socket-id, object: user-info
    _activeConnections: Map<string, ActiveConnection>;

    httpServer: http.Server | undefined;

    socketServer: Server;

    constructor(gameServer: GameServer);

    constructor(private gameServer: GameServer, io?: Server, private readonly port?: number) { // maybe use partial
        this._expectedConnections = new Map();
        this._activeConnections = new Map();

        this.port = port ?? 8090;
        this.socketServer = io ?? this.createServer();

        this.socketServer!.use((socket: Socket, next: any) => this.authenticationFilter(socket, next));
        this.socketServer!.on(NETWORK_EVENTS.CONNECT, (socket: Socket) => this.onConnection(socket));
    }

    private createServer() : Server {
        const app = express();
        this.httpServer = http.createServer(app);
        return new socketio.Server(this.httpServer, { cors: { origin: '*' } });
    }

    listen() {
        this.httpServer!.listen(this.port, () => {
            const address = this.httpServer!.address()!;
            if (typeof address === 'string') {
                console.log(`Server started on ${address}`);
            }
            else {
                console.log(`Server started on ${address.address}/${address.port}`);
            }
        });
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

        socket.on(NETWORK_EVENTS.DISCONNECT, (reason: string) => this.onDisconnection(reason, conn));
        socket.on(NETWORK_EVENTS.COMMAND, (payload: SocketMessage) => this.onCommand(conn, payload));

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
        this.socketServer!.local.emit(NETWORK_EVENTS.COMMAND, msg);
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
        conn.socket.emit(NETWORK_EVENTS.COMMAND, msg);
    }

    /**
     * Closes the network server and releases the connections.
     */
    async terminate() {
        console.log("Network server is terminating...");

        await this.socketServer!.close();

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
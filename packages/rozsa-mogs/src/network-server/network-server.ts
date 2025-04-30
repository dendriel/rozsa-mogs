import {Server, Socket} from 'socket.io';
import http from 'http';
import https from 'https';
import fs from 'fs';
import express from 'express';
import socketio from 'socket.io';
import {IncomingMessage} from 'http';
import {ConnectionInfo} from "./connection-info";
import {ActiveConnection} from "./active-connection";
import {GameServer} from "./game-server";
import {SocketMessage} from "./socket-message";
import {NETWORK_EVENTS} from "./constants";
import ConnectionParams from "./connection-params.js";
import {ServerOptions} from "https";

interface NetworkSslConfig {
    /**
     * The path to the private key.
     */
    keyPath: string;
    /**
     * The path to the certificate.
     */
    certPath: string;
}

interface NetworkServerConfig {
    /**
     * Use a manually configured socket.io instead of the library autoconfigured one.
     */
    io: Server;
    /**
     * Server listening port.
     * *Can be override in listen() method.
     */
    port: number;
    /**
     * Make the server work on Lobby mode, ignoring expected connections.
     */
    lobbyMode: boolean;
    /**
     * (lobby mode) Required code to join the lobby.
     */
    lobbyCode: string;
    /**
     * (lobby mode) Maximum players allowed in the lobby.
     * *There is no player limit if not specified.
     */
    lobbyMaxPlayers: number;
    /**
     * SSL credentials if using a secure connection.
     */
    ssl: NetworkSslConfig;
}


export class NetworkServer {
    private static readonly CONN_TOKEN = 'conn_token';
    private static readonly CONN_ID = 'conn_id';

    private static readonly defaultPort = 8090;

    // key: token, object: user-info
    private readonly _expectedConnections: Map<string, ConnectionInfo>;
    // key: socket-id, object: user-info
    private readonly _activeConnections: Map<string, ActiveConnection>;

    private httpServer: http.Server | undefined;

    private socketServer: Server;

    constructor(private gameServer: GameServer, private config: Partial<NetworkServerConfig> = {}) {

        this._expectedConnections = new Map();
        this._activeConnections = new Map();

        this.socketServer = config.io ?? this.createServer();

        this.socketServer!.use((socket: Socket, next: any) => this.authenticationFilter(socket, next));
        this.socketServer!.on(NETWORK_EVENTS.CONNECT, (socket: Socket) => this.onConnection(socket));
    }

    private createServer() : Server {
        const app = express();

        if (!this.config.ssl) {
            this.httpServer = http.createServer(app);
        }
        else {
            const options : ServerOptions = {
                key: fs.readFileSync(this.config.ssl.keyPath),
                cert: fs.readFileSync(this.config.ssl.certPath)
            };
            this.httpServer = https.createServer(options, app);
        }

        return new socketio.Server(this.httpServer, { cors: { origin: '*' } });
    }

    listen(customPort?: number) {
        const targetPort = customPort ?? this.config.port ?? NetworkServer.defaultPort;

        this.httpServer!.listen(targetPort, () => {
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
        assertValidString(token, NetworkServer.CONN_TOKEN);

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

    private isConnectionExpected(token: string, connParams: ConnectionParams): boolean {
        if (!this.config.lobbyMode) {
            return this._expectedConnections.has(token);
        }

        // Check if the lobby is full.
        if (this.config.lobbyMaxPlayers &&
            this.activeConnections.length >= this.config.lobbyMaxPlayers) {
            console.log(`Lobby is already full with ${this.activeConnections.length} players.`);
            return false;
        }

        if (!connParams.get(NetworkServer.CONN_ID)) {
            // Can't connect in an open lobby without an ID.
            console.log(`Missing connection ID.`);
            return false;
        }

        if (this.config.lobbyCode && this.config.lobbyCode !== token) {
            console.log(`Invalid lobby code: ${token}. Expected: ${this.config.lobbyCode}`)
            return false;
        }

        // Accept the connection if the lobby is open (doesn't require a code).
        return true;
    }

    private authenticationFilter(socket: Socket, next: any) {
        const connParams = this.getConnectionParams(socket.request);
        const connToken = connParams.get(NetworkServer.CONN_TOKEN)!;

        if (!this.isConnectionExpected(connToken, connParams)) {
            console.log("DENIED unauthorized incoming connection with token: ", connToken);
            next(new Error('Not authorized'));
            return;
        }

        console.log("ACCEPTED incoming connection with token: ", connToken);

        next();
    }

    private getConnectionParams(req: IncomingMessage): ConnectionParams {
        const url = new URL(req.url!, `http://${req.headers.host}`);

        const params = new Map<string, string>();
        for (let e of url.searchParams.entries()) {
            params.set(e[0], e[1]);
        }

        return new ConnectionParams(params);
    }

    private getParam(name: string, req: IncomingMessage): string {
        const url = new URL(req.url!, `http://${req.headers.host}`);

        const param = url.searchParams.get(name);
        return param ?? '';
    }

    /**
     * Handle a new connection. *The token was already validated inside the authenticationFilter.
     * @param socket
     * @private
     */
    private onConnection(socket: Socket) {
        const params = this.getConnectionParams(socket.request);
        const connToken = params.get(NetworkServer.CONN_TOKEN)!;

        let info: ConnectionInfo;
        if (!this.config.lobbyMode) {
            info = this._expectedConnections.get(connToken)!;
        }
        else {
            // Automatically creates the connection info for lobby players.
            info = new class implements ConnectionInfo {
                token(): string { return params.get(NetworkServer.CONN_ID)!; }
            }
        }


        let conn = new ActiveConnection(socket, info, params);
        this.addActiveConnection(socket.id, conn);

        this.removeExpectedConnection(connToken);

        socket.on(NETWORK_EVENTS.DISCONNECT, (reason: string) => this.onDisconnection(reason, conn));
        socket.on(NETWORK_EVENTS.COMMAND, (payload: SocketMessage) => this.onCommand(conn, payload));

        console.log("New connection received with token: ", connToken);

        this.gameServer.onConnection(conn);
    }

    disconnect(token: string) {
        assertValidString(token, "token");
        let conn = this.getActiveConnectionByToken(token);
        if (!conn) {
            console.log(`Player with token "${token}" is not connected!`);
            return;
        }

        conn.socket.disconnect(true);
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
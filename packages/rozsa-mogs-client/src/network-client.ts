import {io, Socket} from 'socket.io-client';
import {SocketMessage} from "./socket-message";
import {NETWORK_EVENTS} from "./constants";
import {GameClient} from "./game-client";


export interface ConnectionConfig {
    /**
     * The connection token required to be authorized in the server.
     */
    connectionToken: string;
    /**
     * (lobby mode) Unique connection identifier. Cache it to allow player reconnecting to the server.
     */
    connectionId: string;
    /**
     * Extra custom parameters expected by the server (e.g.: nickname, game preferences, etc).
     * *As it is encoded in the connection URL, it has the same limitations of a URL (i.e.: limited size).
     */
    extraParams: Map<string, string>;
}

export class NetworkClient {
    socket: Socket | null = null;
    constructor(private gameClient: GameClient, private serverAddress: string) {}

    /**
     * Connect to the remote server.
     * @param config connection configurations.
     */
    connect(config: Partial<ConnectionConfig>) {
        let query: any = {};
        if (config.connectionToken) {
            query = { conn_token: config.connectionToken, conn_id: config.connectionId }
        }

        if (config.extraParams) {
            // set value using assigment instead of .set() so it works in the browser.
            config.extraParams.forEach( (v, k) => query[k] = v);
        }

        this.socket = io(this.serverAddress, { query: query } );

        this.socket.on(NETWORK_EVENTS.CONNECT_ERROR, this.onConnectError.bind(this));
        this.socket.on(NETWORK_EVENTS.DISCONNECT, this.onDisconnection.bind(this));
        this.socket.on(NETWORK_EVENTS.COMMAND, this.onCommand.bind(this));
    }

    onConnectError(error: Error) {
        // TODO: ideally we should parse the error and throw a lib error instead of just forwarding.
        this.gameClient.onConnectError(error);
    }

    onDisconnection(reason: string) {
        this.gameClient.onDisconnection(reason);
    }

    onCommand(msg: SocketMessage) {
        this.gameClient.onCommand(msg.command, msg.payload);
    }

    send(command: string, payload: any) {
        if (!this.socket) {
            throw new Error('Not connected yet!');
        }

        const msg = new SocketMessage(command, payload);
        this.socket.emit(NETWORK_EVENTS.COMMAND, msg);
    }
}
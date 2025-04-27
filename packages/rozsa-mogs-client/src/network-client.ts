import {io, Socket} from 'socket.io-client';
import {SocketMessage} from "./socket-message";
import {NETWORK_EVENTS} from "./constants";
import {GameClient} from "./game-client";

export class NetworkClient {
    socket: Socket | null = null;
    constructor(private gameClient: GameClient, private serverAddress: string) {}

    /**
     * Connect to the remote server.
     * @param connectionToken the connection token required to be authorized in the server.
     * @param params custom parameters expected by the server (e.g.: nickname, game preferences, etc).
     */
    connect(connectionToken?: string, params?: Map<string, string>) {
        let query: any = {};
        if (connectionToken) {
            query = { token: connectionToken }
        }

        if (params) {
            // set value using assigment instead of .set() so it works in the browser.
            params.forEach( (v, k) => query[k] = v);
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
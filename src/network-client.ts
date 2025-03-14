import {io, Socket} from 'socket.io-client';
import {SocketMessage} from "./socket-message";
import {NETWORK_EVENTS} from "./constants";
import {GameClient} from "./game-client";

export class NetworkClient {
    socket: Socket | null = null;
    constructor(private gameClient: GameClient, private serverAddress: string) {}

    connect(connectionToken?: string) {
        let query: any = {};
        if (connectionToken) {
            query = { token: connectionToken }
        }

        this.socket = io(this.serverAddress, { query: query } );

        this.socket.on(NETWORK_EVENTS.CONNECT_ERROR, this.onConnectError.bind(this));
        this.socket.on(NETWORK_EVENTS.DISCONNECT, this.onDisconnection.bind(this));
        this.socket.on(NETWORK_EVENTS.COMMAND, this.onCommand.bind(this));
    }

    onConnectError(error: Error) { // idk the type yet
        // TODO: ideally we should parse the error and throw a lib error instead of just fowarding.
        this.gameClient.onConnectError(error);
    }

    onDisconnection(reason: string) {
        this.gameClient.onDisconnection(reason);
    }

    onCommand(msg: SocketMessage) {
        this.gameClient.onCommand(msg.command, msg.payload.payload);
    }

    send(command: string, payload: any) {
        if (!this.socket) {
            throw new Error('Not connected yet!');
        }

        const msg = new SocketMessage(command, payload);
        this.socket.emit(NETWORK_EVENTS.COMMAND, msg);
    }
}
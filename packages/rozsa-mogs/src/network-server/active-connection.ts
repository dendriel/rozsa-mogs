import {ConnectionInfo} from "./connection-info";
import {Socket} from "socket.io";
import ConnectionParams from "./connection-params.js";

/**
 * Represents the connected player.
 */
export class ActiveConnection {
    /**
     * Create a new ActiveConnection.
     * @param _socket network socket related to this connection.
     * @param _info custom info payload.
     * @param _params the client parameters sent while connecting to the server.
     */
    constructor(private _socket: Socket, private _info: ConnectionInfo, private _params: ConnectionParams) {}
    get socket() { return this._socket; }
    get info() { return this._info; }
    get params(): ConnectionParams { return this._params; }
}
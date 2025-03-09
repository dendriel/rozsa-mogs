import {ConnectionInfo} from "./connection-info";
import {Socket} from "socket.io";

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
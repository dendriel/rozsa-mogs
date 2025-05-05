# Rozsa Multiplayer Online Game Server (MOGS)

This library provides a network/game server implementation using websockets.

The aim of this project is to abstract the network part of creating multiplayer games.

## Why

I created this project to study the Typescript language features while having a bit of fun. I've used an old websocket
based-game using Phaser and started generalizing its network-server features to create a TS library from it.

## Features

- Client and Server side websocket abstractions
- Define and authorize only expected connections
- Allows sharing client information on connection
- Server Lobby Mode and Matchmaking Mode
- Authentication for incoming players
- Handle reconnections
- Game-loop default implementation

## Usage

> If you prefer a hands-on example, take a look at the [Princeps Memory Game](https://github.com/dendriel/princeps) project.

### Lobby Mode
Lobby mode is used when you want to allow players to connect using a shared code until the server is full. 

#### Server

```ts
export class YourGameServer implements GameServer {

    private readonly networkServer: NetworkServer;

    constructor(...) {
        // Configure the server
        this.networkServer = new mogs.NetworkServer(this, {
            lobbyMode: lobbyMode,
            lobbyCode: lobbyCode, // The code shared with players to join
            lobbyMaxPlayers: playersCount, // Max count of expected players
            ssl: sslCfg // Optional support for SSL/TLS
        });
    }
    
    start(port: number) {
        this.networkServer.listen(port);
    }

    onConnection(conn: ActiveConnection) {
        // handle new connections (already authenticated).
    }

    onDisconnection(conn: ActiveConnection) {
        // clean after a player leaves
    }

    onCommand(conn: ActiveConnection, cmd: string, payload: any) {
        // handle player commands
    }
}
```

#### Client

```ts
export class YourGameClient implements GameClient {

    private readonly networkClient: NetworkClient | undefined;
    private readonly playerId: string;

    constructor(address: string, port: number) {
        // Configure the client
        this.networkClient = new mogs.NetworkClient(this, `//${address}:${port}/`);
        this.playerId = uuidv4();
    }
    
    connect(...) {
        this.networkClient.connect({
            connectionToken: lobbyCode, // Lobby code expected by the game-server
            connectionId: this.playerId, // Random player ID used to identify the player (and to reconnect if necessary)
            extraParams: this.getConnectionParams()
        });
    }

    onConnectError(error: Error) {
        // handle connection failures.
    }

    onDisconnection(reason: string) {
        // handle server disconnection.
    }

    onCommand(cmd: string, payload: any) {
        // handle commands received from the server.
    }
}
```

### Matchmaking Mode

Matchmaking mode is used when you assign a specific token for each player to be used to join the server.

#### Server
The code is much like as in the Lobby Mode. What changes:
```ts
    // Configure the server
    this.networkServer = new mogs.NetworkServer(this, { ssl: sslCfg });

    this.networkServer.addExpectedConnection(new ConnectionInfoImpl("ABCD")); // token player 1
    this.networkServer.addExpectedConnection(new ConnectionInfoImpl("1234")); // token player 2


    this.networkServer.listen(port);
}
```

#### Client

In the client, the connectionToken now is the assigned player token.
```ts
    this.networkClient = new mogs.NetworkClient(this, `//${address}:${port}/`);

    this.networkClient.connect({ connectionToken: "ABCD" /* player 1 token */, extraParams: this.getConnectionParams() });
}
```

### Sending Commands


#### Server
The NetworkServer provides the `send` function to send a command to a specific player/connection and the `broadcast`
function, which allows to send commands to all connected players:

```ts
// Broadcasting a message to all connected players
const payload = new UpdateScorePayload(...);
this.networkServer.broadcast("UPDATE_SCORE", payload);

// Sending messages to a specific player by using the connected player-token
const payload = new ActivateTurnPayload(...);
this.networkServer.send(player.token, "ACTIVATE_TURN", payload);
```
*Both in Lobby and Matchmaking modes the player-token is made available to the server in the `onConnection` callback.

#### Client
The NetworkClient can only `send` messages towards the NetworkServer:

```ts
const payload = new UpdateNicknamePayload(...);
this.networkClient.send("UPDATE_NICKNAME", payload);
```

# Development

## Publish

```shell
npm login
npm run publish
```
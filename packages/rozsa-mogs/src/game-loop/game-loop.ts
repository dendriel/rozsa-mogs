import {TimeUtils} from "../time-utils";
import {GameCommand} from "./game-command";
import {GameStepHandler} from "./game-step-handler";
import {GameOverHandler} from "./game-over-handler";
import {GameLoopConfig} from "./game-loop-config";


/**
 * Controls the game-flow.
 *
 * @typeParam Context - is the type of the context that will be made available for GameStepHandlers.
 *
 * The GameLoop is responsible for running the game commands and updates in a specific order and continuously until
 * the game-finishing condition is achieved or reached.
 *
 */
export class GameLoop<Context> {
    isRunning: boolean = false;

    frameSleep;

    newCommands: GameCommand<Context>[];
    commandBacklog: GameCommand<Context>[];
    gameHandlers: GameStepHandler<Context>[];

    constructor(
        private readonly config: GameLoopConfig,
        private context: any,
        handlers: GameStepHandler<Context>[],
        private gameOverHandler: GameOverHandler<Context>
    ) {
        this.newCommands = [];
        this.commandBacklog = [];
        this.gameHandlers = []

        this.frameSleep = 1000 / config.fps;

        this.setupHandlers(handlers);
    }

    setupHandlers(handlers: any[]) {
        this.gameHandlers.push(this.retrieveNewActions);
        this.gameHandlers.push(this.handleActions);
        this.gameHandlers.push(...handlers);
        this.gameHandlers.push(this.handleGameOver);
    }

    start() {
        this.isRunning = true;
        this.update()
            .then(() => console.log("Game loop has finished!"));
    }

    stop() {
        this.isRunning = false;
    }

    enqueue(command: GameCommand<Context>) {
        this.newCommands.push(command);
    }

    async update(): Promise<void> {
        while(this.isRunning) {
            // Precise frame-rate control is not necessary, sleep the same amount every time.
            await TimeUtils.sleep(this.frameSleep)

            this.gameHandlers.forEach(handler => {
                if (this.isRunning) {
                    handler(this.context);
                }
            });
        }
    }

    retrieveNewActions(_: Context) {
        this.newCommands.forEach(a => a.initialize(this.context));
        this.commandBacklog.push(...this.newCommands);
        this.newCommands.length = 0;
    }

    handleGameOver(context: Context) {
        if (this.gameOverHandler(context)) {
            this.isRunning = false;
            console.log('Game over condition was meet.');
        }
    }

    handleActions(_: Context) {
        if (this.commandBacklog.length === 0) {
            return;
        }

        let finishedCommands = []
        for (let i = 0; i < this.commandBacklog.length; i++) {
            const cmd = this.commandBacklog[i]!;
            try {
                if (cmd.isInvalid(this.context)) {
                    cmd.onInvalidated(this.context);
                    console.log(`Command ${cmd.constructor.name} is invalid.`)
                    finishedCommands.push(cmd);
                }
                else if (cmd.isReady(this.context)) {
                    cmd.execute(this.context);
                    finishedCommands.push(cmd);
                }
            } catch (e: any) {
                console.log(`Skipping buggy action: ${cmd.constructor.name} - ${JSON.stringify(cmd)}\n${e.stack}`);
                finishedCommands.push(cmd);
            }
        }

        this.commandBacklog = this.commandBacklog.filter(cmd => !finishedCommands.includes(cmd));
    }
}
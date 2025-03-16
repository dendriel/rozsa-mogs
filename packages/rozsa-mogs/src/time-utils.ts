
export class TimeUtils {

    static getNow() : DOMHighResTimeStamp {
        return performance.now();
    }

    static elapsedInMs(time : DOMHighResTimeStamp) : DOMHighResTimeStamp {
        return this.getNow() - time;
    }

    static expired(lastAction: DOMHighResTimeStamp, interval: number) {
        return TimeUtils.elapsedInMs(lastAction) > interval;
    }

    static sleep(timeMs: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, timeMs);
        });
    }
}
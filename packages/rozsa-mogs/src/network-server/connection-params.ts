

export default class ConnectionParams {
    constructor(private params: Map<string, string>) {}

    get(key: string): string | undefined {
        return this.params.get(key);
    }

    getAsNumber(key: string): number | undefined {
        return +this.params.get(key)!;
    }

    getAsBoolean(key: string): boolean | undefined {
        const val = this.params.get(key);

        if (!val) {
            return undefined;
        }

        const lowerVal = val.toLowerCase();
        if (lowerVal !== 'true' && lowerVal !== 'false') {
            return undefined;
        }

        return lowerVal === 'true';
    }

    getAsMap(): Map<string, string> {
        return new Map(this.params);
    }
}
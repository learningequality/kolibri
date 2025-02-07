// originally from http://stackoverflow.com/a/14657922/723299.
// Temporarily duplicated in Bloom Player and Bloom Desktop (under Drag Activity),
// but planned to become a Bloom Player artifact.

interface ILiteEvent<T> {
    subscribe(handler: (data?: T) => void): void;
    unsubscribe(handler: (data?: T) => void): void;
}

export default class LiteEvent<T> implements ILiteEvent<T> {
    private handlers: Array<(data?: T) => void> = [];

    public subscribe(handler: (data?: T) => void) {
        if (this.handlers.indexOf(handler) === -1) {
            this.handlers.push(handler);
        }
    }

    public unsubscribe(handler: (data?: T) => void) {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    public raise(data?: T) {
        this.handlers.slice(0).forEach(h => h(data));
    }
}

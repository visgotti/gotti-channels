"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Subscriber {
    constructor(subSocket) {
        this.subSocket = subSocket;
        this.onPublicationHandlers = new Map();
        this.registerOnPublicationHandlers();
    }
    /**
     * Used when adding a handler for incoming requests.
     * @param name - name of the request
     * @param handler - function used to process data
     */
    addHandler(name, handler) {
        this.onPublicationHandlers.set(name, handler);
        this.subSocket.subscribe(name);
    }
    removeHandler(name) {
        this.onPublicationHandlers.delete(name);
    }
    registerOnPublicationHandlers() {
        this.subSocket.on('message', (...args) => {
            const name = args[0].toString();
            const data = JSON.parse(args[1]);
            const handler = this.onPublicationHandlers.get(name);
            if (handler) {
                handler(data);
            }
        });
    }
}
exports.Subscriber = Subscriber;

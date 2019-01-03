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
        if (!(this.onPublicationHandlers.has(name))) {
            this.onPublicationHandlers.set(name, []);
            this.subSocket.subscribe(name);
        }
        const handlers = this.onPublicationHandlers.get(name);
        handlers.push(handler);
    }
    removeAllHandlers(name) {
        this.onPublicationHandlers.delete(name);
    }
    /**
     * removes handler of a subscription at certain index
     * returns how many handlers are left for subscription.
     * @param name
     * @param index
     * @returns {number}
     */
    removeHandler(name, index) {
        const handlers = this.onPublicationHandlers.get(name);
        if (index < handlers.length) {
            handlers.splice(index, 1);
            if (handlers.length === 0) {
                this.onPublicationHandlers.delete(name);
            }
        }
        return handlers.length;
    }
    registerOnPublicationHandlers() {
        this.subSocket.on('message', (...args) => {
            const name = args[0].toString();
            const data = JSON.parse(args[1]);
            const handlers = this.onPublicationHandlers.get(name);
            if (!(handlers))
                return;
            for (let i = 0; i < handlers.length; i++) {
                handlers[i](data);
            }
        });
    }
}
exports.Subscriber = Subscriber;

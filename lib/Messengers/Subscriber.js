"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Subscriber {
    constructor(subSocket) {
        this.idsAssigned = 0;
        this.handlersByName = new Map();
        this.handlerIdToNames = new Map();
        this.subSocket = subSocket;
        this.registerOnPublicationHandlers();
    }
    /**
     * Used when adding a handler for incoming requests.
     * @param name - name linked to the handler.
     * @param id - handler instance identifier
     * @param handler - function used to process data
     * @returns number - returns id of handler used for removing specific one.
     */
    addHandler(name, id, handler) {
        // first we find out if the id already has a handler registered for the subscription name.
        if (this.handlerIdToNames.has(id) && this.handlerIdToNames.get(id).has(name)) {
            return { success: false, error: `id ${id} already exists for handler ${name}` };
        }
        // now check if theres already a subscription with name, otherwise subscribe and initialize it.
        if (!(this.handlersByName.has(name))) {
            this.handlersByName.set(name, []);
            this.subSocket.subscribe(name);
        }
        // then check if id has a lookup yet, if not add it then add name of handler.
        if (!(this.handlerIdToNames.has(id))) {
            this.handlerIdToNames.set(id, new Set());
        }
        const lookup = this.handlerIdToNames.get(id);
        lookup.add(name);
        const handlers = this.handlersByName.get(name);
        // set id of supplied handler with id provided for later lookup
        handler.id = id;
        handlers.push(handler);
        return { success: true };
    }
    /**
     * Removes all handlers with name
     * @param name
     */
    removeAllHandlersWithName(name) {
        const handlers = this.handlersByName.get(name);
        for (let i = 0; i < handlers.length; i++) {
            const names = this.handlerIdToNames.get(handlers[i].id);
            if (names.has(name)) {
                names.delete(name);
            }
            if (names.size === 0) {
                this.handlerIdToNames.delete(handlers[i].id);
            }
        }
        this.handlersByName.delete(name);
    }
    /**
     * removes handler of a subscription by id and name
     * @param id - id of handler.
     * @param name - name of subscription to remove handler for
     * @returns { success: boolean, handlersLeft: number } data about removed handler.
     */
    removeHandlerById(id, name) {
        const handlers = this.handlersByName.get(name);
        for (let i = 0; i < handlers.length; i++) {
            if (handlers[i].id === id) {
                this.handlerIdToNames.get(id).delete(name);
                handlers.splice(i, 1);
                if (handlers.length === 0) {
                    this.handlersByName.delete(name);
                }
                return {
                    success: true,
                    handlersLeft: handlers.length
                };
            }
        }
        return { success: false };
    }
    /**
     * removes all handlers for all subscriptions that have the given id.
     * @param id - id used to identify handlers for different subscription names.
     * @returns number - ammount of handlers removed.
     */
    removeAllHandlersWithId(id) {
        const names = this.handlerIdToNames.get(id);
        let removed = 0;
        names.forEach(name => {
            let { success } = this.removeHandlerById(id, name);
            if (success)
                removed++;
        });
        return removed;
    }
    getSubscriptionNamesWithId(id) {
        return Array.from(this.handlerIdToNames.get(id));
    }
    getHandlerIdsForName(name) {
        const handlers = this.handlersByName.get(name);
        return handlers.map(handler => handler.id);
    }
    registerOnPublicationHandlers() {
        this.subSocket.on('message', (...args) => {
            const name = args[0].toString();
            const data = JSON.parse(args[1]);
            const handlers = this.handlersByName.get(name);
            if (!(handlers))
                return;
            for (let i = 0; i < handlers.length; i++) {
                handlers[i](data);
            }
        });
    }
}
exports.Subscriber = Subscriber;

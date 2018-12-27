"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Responder {
    constructor(dealerSocket) {
        this.dealerSocket = dealerSocket;
        this.onRequestHooks = new Map();
        this.registerOnRequestHooks();
    }
    /**
     * Used when adding a handler for incoming requests.
     * @param name - name of the request
     * @param hook - function used to process and return data
     */
    addOnRequestHook(name, hook) {
        this.onRequestHooks.set(name, hook);
    }
    removeOnRequestHook(name) {
        if (this.onRequestHooks.has(name)) {
            this.onRequestHooks.delete(name);
            return true;
        }
        return false;
    }
    /**
     * @param response - response message to encode and send
     * @param toServerId - id of the server waiting for response
     */
    sendResponse(response, toServerId) {
        const encoded = JSON.stringify(response);
        this.dealerSocket.send([toServerId, '', encoded]);
    }
    registerOnRequestHooks() {
        this.dealerSocket.on('message', (...args) => {
            if (args[1]) {
                const request = JSON.parse(args[1]);
                const response = { sequence: request.sequence, data: {} };
                const onRequestHook = this.onRequestHooks.get(request.name);
                if (onRequestHook) {
                    response.data = onRequestHook(request.data);
                }
                this.sendResponse(response, request.from);
            }
        });
    }
}
exports.Responder = Responder;

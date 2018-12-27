"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zmq = require("zeromq");
/*
    Router Socket which routes messages
    from a channel to an back
 */
class Broker {
    /**
     * @param {string} routerURI - URI string for the brokers router
     * @param {int} id - Unique identifier of the broker.
     */
    constructor(routerURI, id) {
        this.routerSocket = {};
        this.routerSocket = zmq.socket('router');
        this.routerSocket.identity = `broker ${id} `;
        this.routerSocket.bindSync(routerURI);
        this.registerRouterMessages();
    }
    registerRouterMessages() {
        // relays message from based on args[1]
        this.routerSocket.on('message', (...args) => {
            this.routerSocket.send([args[1], '', args[3]]);
        });
    }
    close() {
        this.routerSocket.close();
    }
}
exports.Broker = Broker;
;

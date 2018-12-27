"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Publisher {
    constructor(pubSocket) {
        this.pubSocket = pubSocket;
    }
    makeForHook(name, beforeHook) {
        return ((...args) => {
            const sendData = beforeHook(...args);
            const encoded = JSON.stringify(sendData);
            this.pubSocket.send([name, encoded]);
        });
    }
    makeForData(name) {
        return ((data) => {
            const encoded = JSON.stringify(data);
            this.pubSocket.send([name, encoded]);
        });
    }
}
exports.Publisher = Publisher;

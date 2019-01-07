"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Publisher {
    constructor(pubSocket) {
        this.pubSocket = pubSocket;
    }
    make(name, encode, beforeHook) {
        if (beforeHook) {
            return this.makeForBeforeHook(name, encode, beforeHook);
        }
        else {
            return this.makeForData(name, encode);
        }
    }
    makeForData(name, encode) {
        return ((data) => {
            if (data === null)
                return;
            const encoded = encode ? encode(data) : data;
            this.pubSocket.send([name, encoded]);
        });
    }
    makeForBeforeHook(name, encode, beforeHook) {
        return ((...args) => {
            const sendData = beforeHook(...args);
            if (sendData === null)
                return;
            const encoded = encode ? encode(sendData) : sendData;
            this.pubSocket.send([name, encoded]);
        });
    }
}
exports.Publisher = Publisher;

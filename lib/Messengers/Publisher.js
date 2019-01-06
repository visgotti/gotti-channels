"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Publisher {
    constructor(pubSocket) {
        this.pubSocket = pubSocket;
    }
    make(name, beforeHook, afterHandler) {
        if (beforeHook) {
            return this.makeForBeforeHook(name, beforeHook, afterHandler);
        }
        else {
            return this.makeForData(name, afterHandler);
        }
    }
    makeForData(name, afterHandler) {
        if (afterHandler) {
            return ((data) => {
                if (data === null)
                    return;
                const encoded = JSON.stringify(data);
                this.pubSocket.send([name, encoded]);
                afterHandler(data);
            });
        }
        else {
            return ((data) => {
                if (data === null)
                    return;
                const encoded = JSON.stringify(data);
                this.pubSocket.send([name, encoded]);
            });
        }
    }
    makeForBeforeHook(name, beforeHook, afterHandler) {
        if (afterHandler) {
            return ((...args) => {
                const sendData = beforeHook(...args);
                if (sendData === null)
                    return;
                const encoded = JSON.stringify(sendData);
                this.pubSocket.send([name, encoded]);
                afterHandler(sendData);
            });
        }
        else {
            return ((...args) => {
                const sendData = beforeHook(...args);
                if (sendData === null)
                    return;
                const encoded = JSON.stringify(sendData);
                this.pubSocket.send([name, encoded]);
            });
        }
    }
}
exports.Publisher = Publisher;

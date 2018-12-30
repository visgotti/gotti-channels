"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ClientState {
    constructor() {
        this._data = {};
    }
    get data() {
        return this._data;
    }
    set data(newData) {
        this._data = newData;
    }
}
exports.ClientState = ClientState;

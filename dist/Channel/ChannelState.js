"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ChannelState {
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
exports.ChannelState = ChannelState;

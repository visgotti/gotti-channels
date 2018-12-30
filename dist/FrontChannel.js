"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Channel_1 = require("./Channel/Channel");
class FrontChannel extends Channel_1.Channel {
    constructor(id, centrum) {
        super(id, centrum, Channel_1.ChannelType.FRONT);
        this._backState = null;
        // front channels want to always store backState regardless of onBackStateUpdate
        // ever registering a callback.
        this._onStateUpdate = (stateData) => {
            this._backState.data = stateData;
        };
    }
    onBackStateUpdate(callback) {
        this._onStateUpdate = (stateData) => {
            this._backState.data = stateData;
            callback(stateData);
        };
    }
    get backState() {
        return this._backState.data;
    }
}
exports.FrontChannel = FrontChannel;

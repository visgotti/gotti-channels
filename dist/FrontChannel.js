"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Channel_1 = require("./base/Channel");
class FrontChannel extends Channel_1.Channel {
    constructor(id, centrum) {
        super(id, centrum, Channel_1.ChannelType.FRONT);
    }
    onBackStateUpdate(callback) {
        this._onStateUpdate = callback;
    }
}
exports.FrontChannel = FrontChannel;

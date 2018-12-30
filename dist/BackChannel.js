"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Channel_1 = require("./Channel/Channel");
class BackChannel extends Channel_1.Channel {
    constructor(id, centrum) {
        super(id, centrum, Channel_1.ChannelType.BACK);
    }
    onFrontStateUpdate(callback) {
        this._onStateUpdate = callback;
    }
}
exports.BackChannel = BackChannel;

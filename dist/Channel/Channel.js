"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require('events');
class Channel extends EventEmitter {
    constructor(channelId, messenger) {
        super();
        this.channelId = channelId;
        this.messenger = messenger;
        this.serverId = messenger.serverId;
    }
}
exports.Channel = Channel;

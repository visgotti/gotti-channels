"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require('events');
class Channel extends EventEmitter {
    constructor(channelId) {
        super();
        this.channelId = channelId;
    }
}
exports.Channel = Channel;

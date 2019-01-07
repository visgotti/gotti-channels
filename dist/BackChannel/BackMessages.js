"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MessageFactory_1 = require("../Channel/MessageFactory");
class BackMessages extends MessageFactory_1.MessageFactory {
    constructor(centrum, channel) {
        super(centrum, channel);
        this.centrum = centrum;
        this.channelId = channel.channelId;
        this.pub = this.initializePubs();
        this.sub = this.initializeSubs();
        this.push = this.initializePushes();
        this.pull = this.initializePulls();
    }
    initializePubs() {
        this.BROADCAST_MIRROR_FRONTS = this.pubCreator(MessageFactory_1.Protocol.BROADCAST_MIRROR_FRONTS(this.channelId));
        this.SET_STATE = this.pubCreator(MessageFactory_1.Protocol.SET_STATE(this.channelId));
        this.PATCH_STATE = this.pubCreator(MessageFactory_1.Protocol.PATCH_STATE(this.channelId));
        this.BROADCAST_ALL_FRONTS = this.pubCreator(MessageFactory_1.Protocol.BROADCAST_ALL_FRONTS());
        return {
            BROADCAST_MIRROR_FRONTS: this.BROADCAST_MIRROR_FRONTS,
            PATCH_STATE: this.SET_STATE,
            SET_STATE: this.PATCH_STATE,
            BROADCAST_ALL_FRONTS: this.BROADCAST_ALL_FRONTS,
        };
    }
    initializePushes() {
        this.CONNECTION_CHANGE = this.pushCreator(MessageFactory_1.Protocol.CONNECTION_CHANGE);
        this.SEND_FRONT = this.pushCreator(MessageFactory_1.Protocol.SEND_FRONT);
        return {
            SEND_FRONT: this.SEND_FRONT,
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
        };
    }
    initializeSubs() {
        this.SEND_BACK = this.subCreator(MessageFactory_1.Protocol.SEND_BACK(this.channelId), this.channelId);
        this.CONNECT = this.subCreator(MessageFactory_1.Protocol.CONNECT(), this.channelId);
        this.DISCONNECT = this.subCreator(MessageFactory_1.Protocol.DISCONNECT(), this.channelId);
        this.BROADCAST_ALL_BACK = this.subCreator(MessageFactory_1.Protocol.BROADCAST_ALL_BACK(), this.channelId);
        return {
            SEND_BACK: this.SEND_BACK,
            CONNECT: this.CONNECT,
            DISCONNECT: this.DISCONNECT,
            BROADCAST_ALL_BACK: this.BROADCAST_ALL_BACK,
        };
    }
    ;
    initializePulls() {
        this.SEND_QUEUED = this.pullCreator(MessageFactory_1.Protocol.SEND_QUEUED);
        return {
            SEND_QUEUED: this.SEND_QUEUED,
        };
    }
}
exports.BackMessages = BackMessages;

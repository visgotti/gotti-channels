"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MessageFactory_1 = require("../Channel/MessageFactory");
class BackMessages extends MessageFactory_1.MessageFactory {
    constructor(messenger, channel) {
        super(messenger, channel);
        this.messenger = messenger;
        this.channelId = channel.channelId;
        this.pub = this.initializePubs();
        this.sub = this.initializeSubs();
        this.push = this.initializePushes();
        this.pull = this.initializePulls();
    }
    initializePubs() {
        this.BROADCAST_ALL_FRONTS = this.pubCreator(MessageFactory_1.Protocol.BROADCAST_ALL_FRONTS());
        return {
            BROADCAST_ALL_FRONTS: this.BROADCAST_ALL_FRONTS,
        };
    }
    initializePushes() {
        this.CONNECTION_CHANGE = this.pushCreator(MessageFactory_1.Protocol.CONNECTION_CHANGE);
        this.SEND_FRONT = this.pushCreator(MessageFactory_1.Protocol.SEND_FRONT);
        this.BROADCAST_LINKED_FRONTS = this.pushCreator(MessageFactory_1.Protocol.BROADCAST_LINKED_FRONTS);
        this.SET_STATE = this.pushCreator(MessageFactory_1.Protocol.SET_STATE); // encoding for states happen in the back channel business logic
        this.PATCH_STATE = this.pushCreator(MessageFactory_1.Protocol.PATCH_STATE, 'NONE');
        return {
            SEND_FRONT: this.SEND_FRONT,
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
            BROADCAST_LINKED_FRONTS: this.BROADCAST_LINKED_FRONTS,
            SET_STATE: this.SET_STATE,
            PATCH_STATE: this.PATCH_STATE,
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
        this.LINK = this.pullCreator(MessageFactory_1.Protocol.LINK);
        this.UNLINK = this.pullCreator(MessageFactory_1.Protocol.UNLINK);
        return {
            SEND_QUEUED: this.SEND_QUEUED,
            LINK: this.LINK,
            UNLINK: this.UNLINK,
        };
    }
}
exports.BackMessages = BackMessages;

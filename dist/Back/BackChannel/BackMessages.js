"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MessageFactory_1 = require("../../Channel/MessageFactory");
class BackMessages extends MessageFactory_1.ChannelMessageFactory {
    constructor(messenger, channel) {
        super(messenger);
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
        this.ACCEPT_LINK = this.pushCreator(MessageFactory_1.Protocol.ACCEPT_LINK); // encoding for states happen in the back channel business logic
        return {
            SEND_FRONT: this.SEND_FRONT,
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
            BROADCAST_LINKED_FRONTS: this.BROADCAST_LINKED_FRONTS,
            ACCEPT_LINK: this.ACCEPT_LINK,
        };
    }
    initializeSubs() {
        this.SEND_BACK = this.subCreator(MessageFactory_1.Protocol.SEND_BACK(this.channelId), this.channelId);
        this.CONNECT = this.subCreator(MessageFactory_1.Protocol.CONNECT(), this.channelId);
        this.BROADCAST_ALL_BACK = this.subCreator(MessageFactory_1.Protocol.BROADCAST_ALL_BACK(), this.channelId);
        return {
            SEND_BACK: this.SEND_BACK,
            CONNECT: this.CONNECT,
            BROADCAST_ALL_BACK: this.BROADCAST_ALL_BACK,
        };
    }
    ;
    initializePulls() {
        this.LINK = this.pullCreator(MessageFactory_1.Protocol.LINK);
        this.UNLINK = this.pullCreator(MessageFactory_1.Protocol.UNLINK);
        this.ADD_CLIENT_WRITE = this.pullCreator(MessageFactory_1.Protocol.ADD_CLIENT_WRITE);
        this.REMOVE_CLIENT_WRITE = this.pullCreator(MessageFactory_1.Protocol.REMOVE_CLIENT_WRITE);
        return {
            LINK: this.LINK,
            UNLINK: this.UNLINK,
            ADD_CLIENT_WRITE: this.ADD_CLIENT_WRITE,
            REMOVE_CLIENT_WRITE: this.REMOVE_CLIENT_WRITE,
        };
    }
}
exports.BackMessages = BackMessages;

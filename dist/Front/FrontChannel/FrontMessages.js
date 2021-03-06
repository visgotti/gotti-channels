"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MessageFactory_1 = require("../../Channel/MessageFactory");
class FrontMessages extends MessageFactory_1.ChannelMessageFactory {
    constructor(messenger, channel) {
        super(messenger);
        this.frontUid = channel.frontUid;
        this.channelId = channel.channelId;
        this.pub = this.initializePubs();
        this.push = this.initializePushes();
        this.sub = this.initializeSubs();
    }
    initializePubs() {
        this.CONNECT = this.pubCreator(MessageFactory_1.Protocol.CONNECT());
        this.BROADCAST_ALL_BACK = this.pubCreator(MessageFactory_1.Protocol.BROADCAST_ALL_BACK());
        this.LINK = this.pubCreator(MessageFactory_1.Protocol.LINK(this.frontUid));
        this.UNLINK = this.pubCreator(MessageFactory_1.Protocol.UNLINK(this.frontUid));
        this.ADD_CLIENT_WRITE = this.pubCreator(MessageFactory_1.Protocol.ADD_CLIENT_WRITE(this.frontUid));
        this.REMOVE_CLIENT_WRITE = this.pubCreator(MessageFactory_1.Protocol.REMOVE_CLIENT_WRITE(this.frontUid));
        //todo figure out cleanest way to do this inside parent class implicitly
        return {
            CONNECT: this.CONNECT,
            BROADCAST_ALL_BACK: this.BROADCAST_ALL_BACK,
            LINK: this.LINK,
            UNLINK: this.UNLINK,
            ADD_CLIENT_WRITE: this.ADD_CLIENT_WRITE,
            REMOVE_CLIENT_WRITE: this.REMOVE_CLIENT_WRITE,
        };
    }
    initializePushes() {
        this.SEND_BACK = this.pushCreator(MessageFactory_1.Protocol.SEND_BACK);
        return {
            SEND_BACK: this.SEND_BACK,
        };
    }
    initializeSubs() {
        this.SEND_FRONT = this.subCreator(MessageFactory_1.Protocol.SEND_FRONT(this.frontUid), this.frontUid);
        this.ACCEPT_LINK = this.subCreator(MessageFactory_1.Protocol.ACCEPT_LINK(this.frontUid), this.frontUid);
        this.CONNECTION_CHANGE = this.subCreator(MessageFactory_1.Protocol.CONNECTION_CHANGE(this.frontUid), this.frontUid);
        this.BROADCAST_ALL_FRONTS = this.subCreator(MessageFactory_1.Protocol.BROADCAST_ALL_FRONTS(), this.frontUid);
        this.BROADCAST_LINKED_FRONTS = this.subCreator(MessageFactory_1.Protocol.BROADCAST_LINKED_FRONTS(this.frontUid), this.frontUid);
        return {
            SEND_FRONT: this.SEND_FRONT,
            ACCEPT_LINK: this.ACCEPT_LINK,
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
            BROADCAST_ALL_FRONTS: this.BROADCAST_ALL_FRONTS,
            BROADCAST_LINKED_FRONTS: this.BROADCAST_LINKED_FRONTS,
        };
    }
}
exports.FrontMessages = FrontMessages;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MessageFactory_1 = require("../Channel/MessageFactory");
class FrontMessages extends MessageFactory_1.MessageFactory {
    constructor(centrum, channel) {
        super(centrum, channel);
        this.centrum = centrum;
        this.frontUid = channel.frontUid;
        this.channelId = channel.channelId;
        this.pub = this.initializePubs();
        this.push = this.initializePushes();
        this.sub = this.initializeSubs();
    }
    initializePubs() {
        this.CONNECT = this.pubCreator(MessageFactory_1.Protocol.CONNECT());
        this.DISCONNECT = this.pubCreator(MessageFactory_1.Protocol.DISCONNECT());
        this.SEND_QUEUED = this.pubCreator(MessageFactory_1.Protocol.SEND_QUEUED(this.frontUid));
        this.BROADCAST_ALL_BACK = this.pubCreator(MessageFactory_1.Protocol.BROADCAST_ALL_BACK());
        //todo figure out cleanest way to do this inside parent class implicitly
        return {
            CONNECT: this.CONNECT,
            DISCONNECT: this.DISCONNECT,
            SEND_QUEUED: this.SEND_QUEUED,
            BROADCAST_ALL_BACK: this.BROADCAST_ALL_BACK,
        };
    }
    initializePushes() {
        this.SEND_BACK = this.pushCreator(MessageFactory_1.Protocol.SEND_BACK);
        return {
            SEND_BACK: this.SEND_BACK,
        };
    }
    initializeSubs() {
        this.CONNECTION_CHANGE = this.subCreator(MessageFactory_1.Protocol.CONNECTION_CHANGE(this.frontUid), this.frontUid);
        this.SEND_FRONT = this.subCreator(MessageFactory_1.Protocol.SEND_FRONT(this.frontUid), this.frontUid);
        this.BROADCAST_MIRROR_FRONTS = this.subCreator(MessageFactory_1.Protocol.BROADCAST_MIRROR_FRONTS(this.channelId), this.frontUid);
        this.BROADCAST_ALL_FRONTS = this.subCreator(MessageFactory_1.Protocol.BROADCAST_ALL_FRONTS(), this.frontUid);
        return {
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
            SEND_FRONT: this.SEND_FRONT,
            BROADCAST_MIRROR_FRONTS: this.BROADCAST_MIRROR_FRONTS,
            BROADCAST_ALL_FRONTS: this.BROADCAST_ALL_FRONTS,
        };
    }
}
exports.FrontMessages = FrontMessages;

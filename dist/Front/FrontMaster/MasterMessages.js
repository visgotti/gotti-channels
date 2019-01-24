"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MessageFactory_1 = require("../../Channel/MessageFactory");
const msgpack = require("notepack.io");
class MasterMessages extends MessageFactory_1.MasterMessageFactory {
    constructor(messenger, frontMasterIndex) {
        super(messenger);
        this.messenger = messenger;
        this.frontMasterIndex = frontMasterIndex;
        this.push = this.initializePushes();
        this.sub = this.initializeSubs();
    }
    initializeSubs() {
        this.PATCH_STATE = this.subCreator(MessageFactory_1.Protocol.PATCH_STATE(this.frontMasterIndex), this.frontMasterIndex, false);
        this.MESSAGE_CLIENT = this.subCreator(MessageFactory_1.Protocol.MESSAGE_CLIENT(this.frontMasterIndex), this.frontMasterIndex, msgpack.decode);
        return {
            PATCH_STATE: this.PATCH_STATE,
            MESSAGE_CLIENT: this.MESSAGE_CLIENT,
        };
    }
    initializePushes() {
        this.SEND_QUEUED = this.pushCreator(MessageFactory_1.Protocol.SEND_QUEUED);
        return {
            SEND_QUEUED: this.SEND_QUEUED,
        };
    }
}
exports.MasterMessages = MasterMessages;

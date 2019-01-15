"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MessageFactory_1 = require("../../Channel/MessageFactory");
class MasterMessages extends MessageFactory_1.MasterMessageFactory {
    constructor(messenger) {
        super(messenger);
        this.messenger = messenger;
        this.push = this.initializePushes();
        this.pull = this.initializePulls();
    }
    initializePulls() {
        this.PATCH_STATE = this.pullCreator(MessageFactory_1.Protocol.PATCH_STATE, 'NONE');
        return {
            PATCH_STATE: this.PATCH_STATE,
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

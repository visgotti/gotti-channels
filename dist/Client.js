"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
class Client {
    constructor(uid) {
        this.uid = uid;
        this.processorChannel = null;
        this.connectedChannels = new Map();
        this._queuedEncodedUpdates = {};
        this.state = null;
    }
    get queuedEncodedUpdates() {
        return this._queuedEncodedUpdates;
    }
    /**
     * Sets connected channel of client also links it.
     * @param channel
     */
    connectToChannel(channel) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const encodedState = yield channel.connectClient(this);
                this.connectedChannels.set(channel.channelId, channel);
                this.addStateUpdate(channel.channelId, encodedState, types_1.STATE_UPDATE_TYPES.SET);
                return encodedState;
            }
            catch (err) {
                throw err;
            }
        });
    }
    /**
     * this sets the channel where client messages get processed.
     * if the client isnt connected, it will call the connect method first.
     * @param channel
     */
    setProcessorChannel(channel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(this.connectedChannels.has(channel.channelId))) {
                try {
                    yield this.connectToChannel(channel);
                    this.processorChannel = channel;
                    return true;
                }
                catch (err) {
                    throw err;
                }
            }
            else {
                this.processorChannel = channel;
                return true;
            }
        });
    }
    addStateUpdate(channelId, update, type) {
        if (!(this.connectedChannels.has(channelId)))
            return false;
        if (!(channelId in this._queuedEncodedUpdates)) {
            this._queuedEncodedUpdates[channelId] = [];
        }
        this._queuedEncodedUpdates[channelId].push({ type, update });
        return this._queuedEncodedUpdates[channelId].length;
    }
    clearStateUpdates() {
        Object.keys(this._queuedEncodedUpdates).forEach(channelId => {
            this._queuedEncodedUpdates[channelId].length = 0;
        });
    }
    /**
     * Message that will be received by every server.
     * @param message
     */
    sendGlobal(message) {
        if (!(this.processorChannel)) {
            throw new Error('Client must have a channel set as its processor channel to send messages. See Client.setProcessor');
        }
        const data = {
            clientUid: this.uid,
            message,
        };
        this.processorChannel.broadcast(data);
    }
    /**
     * sends message to back channel with processorId.
     * @param message
     */
    sendLocal(message) {
        if (!(this.processorChannel)) {
            throw new Error('Client must have a channel set as its processor channel to send messages. See Client.setProcessor');
        }
        const data = {
            clientUid: this.uid,
            message,
        };
        this.processorChannel.addMessage(data);
    }
    disconnect(channelId) {
        if (this.connectedChannels.has(channelId)) {
            this.connectedChannels.get(channelId).disconnectClient(this.uid);
        }
        else {
            this.connectedChannels.forEach(channel => {
                channel.disconnectClient(this.uid);
            });
        }
    }
    // removes queued updates from channel.
    onChannelDisconnect(channelId) {
        if (this.processorChannel && this.processorChannel.channelId === channelId) {
            this.processorChannel = null;
        }
        delete this._queuedEncodedUpdates[channelId];
        this.connectedChannels.delete(channelId);
    }
}
exports.default = Client;

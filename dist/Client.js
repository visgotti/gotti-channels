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
    constructor(uid, masterChannel) {
        this.processorChannelId = '';
        if (!(uid))
            throw new Error('Invalid client uid.');
        this.uid = uid;
        this.masterChannel = masterChannel;
        this.masterChannel.clientConnected(this);
        this._processorChannel = null;
        this.linkedChannels = new Map();
        this._queuedEncodedUpdates = {};
        this.state = null;
    }
    get queuedEncodedUpdates() {
        return this._queuedEncodedUpdates;
    }
    get processorChannel() {
        return this._processorChannel ? this.processorChannelId : null;
    }
    isLinkedToChannel(channelId) {
        return this.linkedChannels.has(channelId);
    }
    /**
     * method to be overridden to handle direct client messages from back channels.
     */
    onMessage(handler) {
        this.onMessageHandler = handler;
    }
    onMessageHandler(data) { throw 'Unimplemented'; }
    ;
    /**
     * Sets connected channel of client also links it.
     * @param channelId
     * @param options to send to back channel
     */
    linkChannel(channelId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const channel = this.masterChannel.frontChannels[channelId];
                if (!channel)
                    throw new Error(`Invalid channelId ${channelId}`);
                const response = yield channel.linkClient(this, options);
                this.linkedChannels.set(channelId, channel);
                this.addStateUpdate(channelId, response.encodedState, types_1.STATE_UPDATE_TYPES.SET);
                return response;
            }
            catch (err) {
                throw err;
            }
        });
    }
    /**
     * setProcessorChannel will set the channel in which a client will relay its messages through.
     * The processor channel will forward the clients messages to the mirrored back channel in which
     * it will process the message and wind up sending back messages/state updates to any linked clients.
     * @param {string} channelId - channelId to set as processor channel.
     * @param {boolean=false} unlinkOld - if you want to unlink from the old processor channel after you set the new one.
     * @param {any} addOptions - options that get sent to the new processor channel
     * @param {any} removeOptions - options that get sent to the old processor channel
     * @returns {boolean}
     */
    setProcessorChannel(channelId, unlinkOld = false, addOptions, removeOptions) {
        const channel = this.masterChannel.frontChannels[channelId];
        // confirm channel id was valid
        if (!channel)
            throw new Error(`Invalid channelId ${channelId} trying to be set as processor for client ${this.uid}`);
        // confirm its not already set as processor
        if (this._processorChannel && channelId === this._processorChannel.channelId)
            throw new Error(`ChannelId ${channelId} is already set as processor for client ${this.uid}`);
        // confirm that the client was previously linked to channel before setting it as processor
        if (!(this.linkedChannels.has(channelId)))
            throw new Error(`Please make sure there is a linkage to ${channelId} before setting it as processor for client ${this.uid}`);
        this._processorChannel && this._processorChannel.removeClientWrite(this.uid, removeOptions);
        channel.addClientWrite(this.uid, addOptions);
        if (unlinkOld)
            this.unlinkChannel(this._processorChannel.channelId);
        this._processorChannel = channel;
        this.processorChannelId = this._processorChannel.channelId;
        return true;
    }
    addStateUpdate(channelId, update, type) {
        if (!(this.linkedChannels.has(channelId)))
            return false;
        if (!(channelId in this._queuedEncodedUpdates)) {
            this._queuedEncodedUpdates[channelId] = [];
        }
        this._queuedEncodedUpdates[channelId].push([channelId, type, update]);
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
    sendGlobal(data) {
        if (this._processorChannel) {
            this._processorChannel.broadcast(data, null, this.uid);
        }
    }
    /**
     * queues message on front channel to send back channel
     * @param message
     */
    sendLocal(data) {
        if (this._processorChannel) {
            this._processorChannel.addMessage(data, this.uid);
        }
    }
    /**
     * sends message instantly
     * @param message
     */
    sendLocalImmediate(data) {
        if (this._processorChannel) {
            this._processorChannel.send(data, this.processorChannelId, this.uid);
        }
    }
    logBuffered(data) {
    }
    unlinkChannel(channelId, options) {
        if (this.linkedChannels.has(channelId)) {
            const linkedChannel = this.linkedChannels.get(channelId);
            linkedChannel.unlinkClient(this.uid, options);
            // checks to see if the current processor channel is the channel we're unlinking from, if so
            // send notification that were removing the client write.
            if (this._processorChannel && linkedChannel.channelId === this._processorChannel.channelId) {
                linkedChannel.removeClientWrite(this.uid);
            }
        }
        else {
            this.linkedChannels.forEach(channel => {
                channel.unlinkClient(this.uid);
            });
            this.masterChannel.clientDisconnected(this.uid);
        }
    }
    onChannelDisconnect(channelId) {
        if (this._processorChannel && this._processorChannel.channelId === channelId) {
            this._processorChannel.removeClientWrite(this.uid);
            this._processorChannel = null;
            this.processorChannelId = '';
        }
        delete this._queuedEncodedUpdates[channelId];
        this.linkedChannels.delete(channelId);
    }
}
exports.default = Client;

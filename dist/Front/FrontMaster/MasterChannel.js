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
const msgpack = require("notepack.io");
const MasterMessages_1 = require("./MasterMessages");
const FrontChannel_1 = require("../FrontChannel/FrontChannel");
const Channel_1 = require("../../Channel/Channel");
class FrontMasterChannel extends Channel_1.Channel {
    constructor(channelIds, frontMasterIndex, messenger) {
        super(frontMasterIndex, messenger);
        this.frontMasterIndex = frontMasterIndex;
        this.frontChannels = {};
        this.frontChannelIds = [];
        this._linkedBackMasterLookup = {};
        this._linkedBackMasterIndexes = [];
        this._connectedBackMasters = new Set(); //todo make this a lookup similar to linked with count of connected channels.
        this._connectedClients = {};
        channelIds.forEach(channelId => {
            const frontChannel = new FrontChannel_1.FrontChannel(channelId, channelIds.length, messenger, this);
            this.frontChannels[channelId] = frontChannel;
            this.frontChannelIds.push(channelId);
        });
        this.initializeMessageFactories();
    }
    get connectedBackMasters() {
        return Array.from(this._connectedBackMasters.values());
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let awaitingConnections = this.frontChannelIds.length;
                for (let i = 0; i < this.frontChannelIds.length; i++) {
                    const connected = yield this.frontChannels[i].connect();
                    // makes sure we connected to at least 1 back master index.
                    if (connected && connected.backMasterIndexes.length) {
                        connected.backMasterIndexes.forEach(backMasterIndex => {
                            // registers pusher if the connected back master index wasnt registered yet.
                            this._connectedBackMasters.add(backMasterIndex);
                            this.push.SEND_QUEUED.register(backMasterIndex);
                        });
                        awaitingConnections--;
                        if (awaitingConnections === 0) {
                            return true;
                        }
                    }
                    else {
                        throw new Error('Error connecting.');
                    }
                }
            }
            catch (err) {
                throw err;
            }
        });
    }
    /**
     * Gets called in client when initialized
     * @param client
     */
    clientConnected(client) {
        this._connectedClients[client.uid] = client;
    }
    /**
     * called in client when disconnect is called
     * @param uid
     * @returns {boolean}
     */
    clientDisconnected(uid) {
        if (this._connectedClients[uid]) {
            delete this._connectedClients[uid];
            return true;
        }
        return false;
    }
    sendQueuedMessages() {
        let length = this._linkedBackMasterIndexes.length;
        while (length--) {
            const masterIndex = this._linkedBackMasterIndexes[length];
            const queuedMessages = this._linkedBackMasterLookup[masterIndex].queuedMessages;
            this.push.SEND_QUEUED[masterIndex](queuedMessages);
            queuedMessages.length = 0;
        }
    }
    /**
     * adds a message to the queue for a specific back Master Channel
     * @param data - message to send
     * @param channel id - used as the last element in index to allow for back master to dispatch correctly. always last index
     * @param backMasterIndex - server index that the linked back channel lives on.
     * @param fromClient - allows back channel to know if it was a client message by checking second to
     * last index when receiving queuedMessages
     */
    addQueuedMessage(data, channelId, backMasterIndex, fromClient = '') {
        if (!(this._linkedBackMasterLookup[backMasterIndex])) {
            throw `The Back Master at index ${backMasterIndex} was not linked`;
        }
        data.push(fromClient);
        data.push(channelId);
        this._linkedBackMasterLookup[backMasterIndex].queuedMessages.push(data);
    }
    unlinkChannel(backMasterIndex) {
        if (--(this._linkedBackMasterLookup[backMasterIndex].linkedChannelsCount) === 0) {
            this._linkedBackMasterLookup[backMasterIndex].queuedMessages.length = 0;
            delete this._linkedBackMasterLookup[backMasterIndex];
            this.updateLinkedBackMasterIndexArray();
        }
    }
    linkChannel(backMasterIndex) {
        if (!(this._linkedBackMasterLookup[backMasterIndex])) {
            this._linkedBackMasterLookup[backMasterIndex] = { linkedChannelsCount: 1, queuedMessages: [] };
            this.updateLinkedBackMasterIndexArray();
        }
        else {
            this._linkedBackMasterLookup[backMasterIndex].linkedChannelsCount++;
        }
    }
    // called when the back master lookup adds or removes a new master link.
    updateLinkedBackMasterIndexArray() {
        this._linkedBackMasterIndexes = Object.keys(this._linkedBackMasterLookup);
    }
    get linkedBackMasterLookup() {
        return this._linkedBackMasterLookup;
    }
    /**
     * initializes needed message factories for front channels.
     */
    initializeMessageFactories() {
        const { push, sub } = new MasterMessages_1.MasterMessages(this.messenger, this.frontMasterIndex);
        this.push = push;
        this.sub = sub;
        this.sub.PATCH_STATE.register((data) => {
            const decoded = msgpack.decode(data);
            for (let i = 0; i < decoded.length; i++) {
                const channelId = decoded[i][0];
                const encodedPatch = decoded[i][1];
                this.frontChannels[channelId].patchState(encodedPatch);
            }
        });
        this.sub.MESSAGE_CLIENT.register((data) => {
            //TODO: add optional protocol to array?
            if (this._connectedClients[data[0]]) {
                this._connectedClients[data[0]].onMessageHandler(data);
            }
        });
    }
    disconnect() {
        this.messenger.close();
    }
}
exports.FrontMasterChannel = FrontMasterChannel;

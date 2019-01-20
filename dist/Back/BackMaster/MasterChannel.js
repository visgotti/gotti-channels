"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fossilDelta = require("fossil-delta");
const msgpack = require("notepack.io");
const MasterMessages_1 = require("./MasterMessages");
const BackChannel_1 = require("../BackChannel/BackChannel");
const Channel_1 = require("../../Channel/Channel");
const DEFAULT_PATCH_RATE = 1000 / 20; // 20fps (50ms)
class BackMasterChannel extends Channel_1.Channel {
    constructor(channelIds, backMasterIndex, messenger) {
        super(backMasterIndex, messenger);
        this.sendStateRate = DEFAULT_PATCH_RATE;
        this.backMasterIndex = backMasterIndex;
        this.backChannels = {};
        this.backChannelsArray = [];
        this._linkedClientFrontDataLookup = new Map();
        this._connectedFrontMasters = new Set();
        this._linkedFrontMasterChannels = {};
        this._linkedFrontMasterIndexesArray = [];
        channelIds.forEach(channelId => {
            const backChannel = new BackChannel_1.BackChannel(channelId, messenger, this);
            this.backChannels[channelId] = backChannel;
            this.backChannelsArray.push(backChannel);
        });
        this.initializeMessageFactories();
    }
    get linkedClientFrontDataLookup() {
        return this._linkedClientFrontDataLookup;
    }
    get linkedFrontMasterChannels() {
        return this._linkedFrontMasterChannels;
    }
    get linkedFrontMasterIndexesArray() {
        return this._linkedFrontMasterIndexesArray;
    }
    get connectedFrontMasters() {
        return Array.from(this._connectedFrontMasters.values());
    }
    // adds update to send to front master if the back channel is linked
    /**
     * Adds a patch to be sent to front masters that are linked. Then the front master will
     * apply it to the channels which need it.
     * @param frontMasterIndexes - indexes that need the patch.
     * @param patchData - patch data that is an encoded array with the channelId as the first element and the patch data as second.
     */
    addStatePatch(frontMasterIndexes, patchData) {
        for (let i = 0; i < frontMasterIndexes.length; i++) {
            this._linkedFrontMasterChannels[frontMasterIndexes[i]].encodedPatches.push(patchData);
        }
    }
    /**
     * patches state of channels which populates the linkedFrontMasterChannels lookup with an array
     * of encoded patches and sends to based on which channelIds that front master needs.
     */
    sendStatePatches() {
        let length = this.backChannelsArray.length;
        while (length--) {
            const backChannel = this.backChannelsArray[length];
            let frontMasterLength = backChannel.linkedFrontMasterIndexes.length;
            if (!(frontMasterLength))
                continue; // back channel had no linked front masters waiting for state updates, can skip.
            while (frontMasterLength--) { //TODO maybe sending redundant messages to frontChannels instead of checking which channels the front master needs will play better in the long run
                const currentState = backChannel.state;
                const currentStateEncoded = msgpack.encode(currentState);
                //TODO trigger onPatchState event
                if (currentStateEncoded.equals(backChannel._previousStateEncoded)) {
                    continue;
                }
                const patches = fossilDelta.create(backChannel._previousStateEncoded, currentStateEncoded);
                backChannel._previousStateEncoded = currentStateEncoded;
                this._linkedFrontMasterChannels[backChannel.linkedFrontMasterIndexes[frontMasterLength]].encodedPatches.push([backChannel.channelId, patches]);
            }
        }
        for (let i = 0; i < this._linkedFrontMasterIndexesArray.length; i++) {
            const frontMasterIndex = this._linkedFrontMasterIndexesArray[i];
            const { encodedPatches } = this._linkedFrontMasterChannels[frontMasterIndex];
            this.push.PATCH_STATE[frontMasterIndex](msgpack.encode(encodedPatches)); // sends array of patches [ channelId, patch ]
            // clears patches
            encodedPatches.length = 0;
        }
    }
    /**
     * sends direct message to client from the back. Data of the client is kept in the _linkedClientFrontDataLookup
     * and is updates when we handle new unlink/link publications from the front channel when the message
     * is supplied with a clientUid notifying that the link/unlink was for a client.
     * @param clientUid - uid of client to send direct message to
     * @param message - message client receives.
     * @returns {boolean}
     */
    messageClient(clientUid, message) {
        if (this._linkedClientFrontDataLookup.has(clientUid)) {
            // if the clientUid is discoverable in the lookup we forward message to the front master so it can relay it to the client.
            this.push.MESSAGE_CLIENT[this._linkedClientFrontDataLookup.get(clientUid).frontMasterIndex]([clientUid, message]);
            return true;
        }
        return false;
    }
    handleNewFrontMasterConnection(frontMasterIndex) {
        this.pull.SEND_QUEUED.register(frontMasterIndex, (messageQueueData => {
            this.handleQueuedMessages(messageQueueData, frontMasterIndex);
        }));
        this.push.PATCH_STATE.register(frontMasterIndex);
        this.push.MESSAGE_CLIENT.register(frontMasterIndex);
    }
    /*  ================================================================================================
        These functions get called by the children channels of master everytime a connection
        or link changes in the child channel since the calls will be infrequent it's better to
        do redundant checks like this instead of adding more messengers between front and back master
        channels.
        ================================================================================================*/
    onChannelConnection(frontMasterIndex) {
        if (!(this._connectedFrontMasters.has(frontMasterIndex))) {
            this._connectedFrontMasters.add(frontMasterIndex);
            this.handleNewFrontMasterConnection(frontMasterIndex);
        }
    }
    linkedChannelFrom(frontMasterIndex) {
        if (!(this._linkedFrontMasterChannels[frontMasterIndex])) {
            this._linkedFrontMasterIndexesArray.push(frontMasterIndex);
            this._linkedFrontMasterChannels[frontMasterIndex] = {
                linkedChannelsCount: 1,
                encodedPatches: [],
            };
        }
        else {
            this._linkedFrontMasterChannels[frontMasterIndex].linkedChannelsCount++;
        }
    }
    unlinkedChannelFrom(frontMasterIndex) {
        if ((--this._linkedFrontMasterChannels[frontMasterIndex].linkedChannelsCount) === 0) {
            this._linkedFrontMasterChannels[frontMasterIndex].encodedPatches.length = 0;
            delete this._linkedFrontMasterChannels[frontMasterIndex];
            const index = this._linkedFrontMasterIndexesArray.indexOf(frontMasterIndex);
            if (index >= 0) {
                this._linkedFrontMasterIndexesArray.splice(index, 1);
            }
        }
    }
    /* ================================================================================================
       ================================================================================================
       ================================================================================================ */
    /**
     * adds client to data lookup if its new, otherwise it adds to the listener count.
     * @param clientUid - identifier of client who is listening to one of the channels on current master
     * @param frontMasterIndex - front master index of where the client lives.
     */
    addedClientLink(clientUid, frontMasterIndex) {
        if (!(this._linkedClientFrontDataLookup.has(clientUid))) {
            this._linkedClientFrontDataLookup.set(clientUid, {
                linkCount: 1,
                frontMasterIndex: frontMasterIndex,
            });
        }
        else {
            this._linkedClientFrontDataLookup.get(clientUid).linkCount++;
        }
    }
    /**
     * decrements the linkCount for given client and if it reaches 0
     * it is removed completely from the lookup.
     * @param clientUid
     */
    removedClientLink(clientUid) {
        const clientData = this._linkedClientFrontDataLookup.get(clientUid);
        if ((clientData && --clientData.linkCount === 0)) {
            this._linkedClientFrontDataLookup.delete(clientUid);
        }
    }
    /**
     * sets an interval for sending the child state patches automatically.
     * @param milliseconds
     */
    setStateUpdateInterval(milliseconds = this.sendStateRate) {
        // clear previous interval in case called setPatchRate more than once
        if (this._sendStateUpdatesInterval) {
            clearInterval(this._sendStateUpdatesInterval);
            this._sendStateUpdatesInterval = undefined;
        }
        if (milliseconds !== null && milliseconds !== 0) {
            this._sendStateUpdatesInterval = setInterval(this.sendStatePatches.bind(this), milliseconds);
        }
    }
    clearSendStateInterval() {
        if (this._sendStateUpdatesInterval) {
            clearTimeout(this._sendStateUpdatesInterval);
        }
        this._sendStateUpdatesInterval = undefined;
    }
    /** messageQueueData is formatted incoming as
     *  [ channelId,  message, clientId? ]
     */
    handleQueuedMessages(messageQueueData, frontMasterIndex) {
        for (let i = 0; i < messageQueueData.length; i++) {
            const data = messageQueueData[i];
            this.backChannels[data[0]].processMessageFromMaster(data[1], frontMasterIndex, data[2]);
        }
    }
    /**
     * initializes needed message factories for front channels.
     */
    initializeMessageFactories() {
        const { push, pull } = new MasterMessages_1.MasterMessages(this.messenger);
        this.push = push;
        this.pull = pull;
    }
    disconnect() {
        if (this._sendStateUpdatesInterval) {
            clearInterval(this._sendStateUpdatesInterval);
            this._sendStateUpdatesInterval = undefined;
        }
        this.messenger.close();
    }
}
exports.BackMasterChannel = BackMasterChannel;

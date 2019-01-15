"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const msgpack = require("notepack.io");
const MasterMessages_1 = require("./MasterMessages");
const BackChannel_1 = require("../BackChannel");
const Channel_1 = require("../../Channel/Channel");
class BackMasterChannel extends Channel_1.Channel {
    constructor(channelIds, backMasterIndex, messenger) {
        super(backMasterIndex, messenger);
        this.backMasterIndex = backMasterIndex;
        this.backChannels = {};
        this.backChannelIds = [];
        this._connectedFrontMasters = new Set();
        this._linkedFrontMasterChannels = {};
        this._linkedFrontMasterIndexesArray = [];
        channelIds.forEach(channelId => {
            const backChannel = new BackChannel_1.default(channelId, messenger, this);
            this.backChannels[channelId] = backChannel;
            this.backChannelIds.push(channelId);
        });
        this.initializeMessageFactories();
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
     * @param encodedPatchData - patch data that is an encoded array with the channelId as the first element and the patch data as second.
     */
    addStatePatch(frontMasterIndexes, patchData) {
        for (let i = 0; i < frontMasterIndexes.length; i++) {
            this._linkedFrontMasterChannels[frontMasterIndexes[i]].encodedPatches.push(patchData);
        }
    }
    sendStatePatches() {
        for (let i = 0; i < this._linkedFrontMasterIndexesArray.length; i++) {
            const frontMasterIndex = this._linkedFrontMasterIndexesArray[i];
            const { encodedPatches } = this._linkedFrontMasterChannels[frontMasterIndex];
            this.push.PATCH_STATE[frontMasterIndex](msgpack.encode(encodedPatches)); // sends array of patches [ channelId, patch ]
            // clears patches
            encodedPatches.length = 0;
        }
    }
    handleNewFrontMasterConnection(frontMasterIndex) {
        this.pull.SEND_QUEUED.register(frontMasterIndex, (messageQueueData => {
            this.handleQueuedMessages(messageQueueData, frontMasterIndex);
        }));
        this.push.PATCH_STATE.register(frontMasterIndex);
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
    /** messageQueueData is formatted incoming as
     *  [ channelId,  message  ]
     */
    handleQueuedMessages(messageQueueData, frontMasterIndex) {
        for (let i = 0; i < messageQueueData.length; i++) {
            const channelId = messageQueueData[i][0];
            const message = messageQueueData[i][1];
            this.backChannels[channelId].processMessageFromMaster(message, frontMasterIndex);
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
    close() {
        for (let i = 0; i < this.backChannelIds.length; i++) {
            this.backChannels[this.backChannelIds[i]].close();
        }
    }
}
exports.BackMasterChannel = BackMasterChannel;

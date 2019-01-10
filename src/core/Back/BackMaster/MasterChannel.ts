import * as fossilDelta from 'fossil-delta';
import * as msgpack from 'notepack.io';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import { MasterMessages, BackMasterPushes, BackMasterPulls } from './MasterMessages';

import BackChannel from '../BackChannel';

export class BackMasterChannel extends Channel {
    private pull: BackMasterPulls;
    private push: BackMasterPushes;

    private linkedFrontMasterIndexesArray: Array<number>;
    private linkedFrontMasterChannels: { frontMasterIndex: number, count: number };

    private backChannels: { channelId: string, channel: BackChannel };
    private backChannelIds: Array<string>;
    private statePatchesByFrontMasterIndex: { frontMasterIndex: number, encodedPatches: Array<any> };

    readonly backMasterIndex;

    constructor(channelIds, backMasterIndex, messenger: Messenger) {
        super(backMasterIndex, messenger);

        this.backChannels = {};
        this.backChannelIds = [];
        this.statePatchesByFrontMasterIndex = {};
        this.linkedFrontMasterIndexesArray = [];
        this.linkedFrontMasterChannels = {};

        channelIds.forEach(channelId => {
            const backChannel = new BackChannel(channelId, this, messenger);
            this.backChannels[channelId] = backChannel;
            this.backChannelIds.push(channelId);
        });

        this.initializeMessageFactories();
    }

    // adds update to send to front master if the back channel is linked
    /**
     * Adds a patch to be sent to front masters that are linked. Then the front master will
     * apply it to the channels which need it.
     * @param frontMasterIndexes - indexes that need the patch.
     * @param encodedPatchData - patch data that is an encoded array with the channelId as the first element and the patch data as second.
     */
    public addStatePatch(frontMasterIndexes, patchData) { //patchData [ channelId, patch ]
        for(let i = 0; i < frontMasterIndexes.length; i++) {
            this.statePatchesByFrontMasterIndex[frontMasterIndexes[i]].push(msgpack.encode(patchData));
        }
    }

    private sendStatePatches() {
        for(let i = 0; i < this.linkedFrontMasterIndexesArray.length; i++) {
            const frontMasterIndex = this.linkedFrontMasterIndexesArray[i];
            this.push.PATCH_STATE[frontMasterIndex](this.statePatchesByFrontMasterIndex[frontMasterIndex]); // sends array of patches [ channelId, patch ]

            // clears patches
            this.statePatchesByFrontMasterIndex[frontMasterIndex].length = 0;
        }
    }

    private handleNewFrontMasterConnection(frontMasterIndex) {
        this.statePatchesByFrontMasterIndex[frontMasterIndex] = [];

        this.pull.SEND_QUEUED.register(frontMasterIndex, (messageQueueData => {
            this.handleQueuedMessages(frontMasterIndex, messageQueueData);
        }));
        this.push.PATCH_STATE.register(frontMasterIndex);
    }


/*  ================================================================================================
    These functions get called by the children channels of master everytime a connection
    or link changes in the child channel since the calls will be infrequent it's better to
    do redundant checks like this instead of adding more messengers between front and back master
    channels.
    ================================================================================================*/

    public onChannelConnection(frontMasterIndex) {
        if(!(this.statePatchesByFrontMasterIndex[frontMasterIndex])) {
            this.statePatchesByFrontMasterIndex[frontMasterIndex] = [];
            this.handleNewFrontMasterConnection(frontMasterIndex);
        }
    }

    public onNewChannelLink(frontMasterIndex) {
        if(!(this.linkedFrontMasterChannels[frontMasterIndex])) {
            this.linkedFrontMasterIndexesArray.push(frontMasterIndex);
            this.linkedFrontMasterChannels[frontMasterIndex] = 1;
        }
    }

    public onChannelUnLink(frontMasterIndex) {
        const linkedCount = this.linkedFrontMasterChannels[frontMasterIndex];

        // no more linked front master remove from structs
        if(--linkedCount === 0) {
            delete this.linkedFrontMasterChannels[frontMasterIndex];

            const index = this.linkedFrontMasterIndexesArray.indexOf(frontMasterIndex);
            if(index >= 0) {
                this.linkedFrontMasterIndexesArray.splice(index, 1);
            }
        }
    }
/* ================================================================================================
   ================================================================================================
   ================================================================================================ */


    private onRemoveChannelLink(frontMasterIndex, channelId) {
        const channels = this.linkedFrontMasterLookup.get(frontMasterIndex);
        if(channels) {
            channels.delete(frontMasterIndex);
            if(channels.size <= 0) {
                this.linkedFrontMasterLookup.delete(frontMasterIndex);
            }
        }
    }

    /** messageQueueData is formatted incoming as
     *  [ channelId,  message  ]
     */
    private handleQueuedMessages(messageQueueData, frontMasterIndex) {
        for(let i = 0; i < messageQueueData.length; i++) {
            const channelId = messageQueueData[i][0];
            const message = messageQueueData[i][1];
            this.backChannels[channelId].processMessageQueue(message, frontMasterIndex);
        }
    }

    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories() {
        const { push, pull } = new MasterMessages(this.messenger);
        this.push = push;
        this.pull = pull;
    }
}
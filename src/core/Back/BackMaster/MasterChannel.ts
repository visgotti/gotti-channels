import * as fossilDelta from 'fossil-delta';
import * as msgpack from 'notepack.io';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import { MasterMessages, BackMasterPushes, BackMasterPulls } from './MasterMessages';

import BackChannel from '../BackChannel';
import { Channel } from '../../Channel/Channel';

export class BackMasterChannel extends Channel {
    private pull: BackMasterPulls;
    private push: BackMasterPushes;

    private _linkedFrontMasterIndexesArray: Array<number>;
    private _linkedFrontMasterChannels: { linkedChannelsCount: number, encodedPatches: Array<any> };
    private _connectedFrontMasters: Set<number>;
    private backChannelIds: Array<string>;

    public backChannels: any;

    readonly backMasterIndex;

    constructor(channelIds, backMasterIndex, messenger: Messenger) {
        super(backMasterIndex, messenger);
        this.backMasterIndex = backMasterIndex;
        this.backChannels = {};
        this.backChannelIds = [];
        this._connectedFrontMasters = new Set();
        this._linkedFrontMasterChannels = {} as { linkedChannelsCount: number, encodedPatches: Array<any> };
        this._linkedFrontMasterIndexesArray = [];

        channelIds.forEach(channelId => {
            const backChannel = new BackChannel(channelId, messenger, this);
            this.backChannels[channelId] = backChannel;
            this.backChannelIds.push(channelId);
        });

        this.initializeMessageFactories();
    }

    get linkedFrontMasterChannels() {
        return this._linkedFrontMasterChannels;
    }

    get linkedFrontMasterIndexesArray() {
        return this._linkedFrontMasterIndexesArray
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
    public addStatePatch(frontMasterIndexes, patchData) { //patchData [ channelId, patch ]
        for(let i = 0; i < frontMasterIndexes.length; i++) {
            this._linkedFrontMasterChannels[frontMasterIndexes[i]].encodedPatches.push(patchData);
        }
    }

    public sendStatePatches() {
        for(let i = 0; i < this._linkedFrontMasterIndexesArray.length; i++) {
            const frontMasterIndex = this._linkedFrontMasterIndexesArray[i];
            const { encodedPatches } = this._linkedFrontMasterChannels[frontMasterIndex];

            this.push.PATCH_STATE[frontMasterIndex](msgpack.encode(encodedPatches)); // sends array of patches [ channelId, patch ]

            // clears patches
            encodedPatches.length = 0;
        }
    }

    private handleNewFrontMasterConnection(frontMasterIndex) {
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

    public onChannelConnection(frontMasterIndex) {
        if(!(this._connectedFrontMasters.has(frontMasterIndex))) {
            this._connectedFrontMasters.add(frontMasterIndex);
            this.handleNewFrontMasterConnection(frontMasterIndex);
        }
    }

    public linkedChannelFrom(frontMasterIndex) {
        if(!(this._linkedFrontMasterChannels[frontMasterIndex])) {
            this._linkedFrontMasterIndexesArray.push(frontMasterIndex);
            this._linkedFrontMasterChannels[frontMasterIndex] =  {
                linkedChannelsCount: 1,
                encodedPatches: [],
            }
        } else {
            this._linkedFrontMasterChannels[frontMasterIndex].linkedChannelsCount++;
        }
    }

    public unlinkedChannelFrom(frontMasterIndex) {
        if( (--this._linkedFrontMasterChannels[frontMasterIndex].linkedChannelsCount) === 0) {

            this._linkedFrontMasterChannels[frontMasterIndex].encodedPatches.length = 0;
            delete this._linkedFrontMasterChannels[frontMasterIndex];

            const index = this._linkedFrontMasterIndexesArray.indexOf(frontMasterIndex);
            if(index >= 0) {
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
    private handleQueuedMessages(messageQueueData, frontMasterIndex) {
        for(let i = 0; i < messageQueueData.length; i++) {
            const channelId = messageQueueData[i][0];
            const message = messageQueueData[i][1];
            this.backChannels[channelId].processMessageFromMaster(message, frontMasterIndex);
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

    public close() {
        for(let i = 0; i < this.backChannelIds.length; i++) {
            this.backChannels[this.backChannelIds[i]].close();
        }
    }
}
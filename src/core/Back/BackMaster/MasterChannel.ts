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

    // lookup to find out which front master a client lives on for direct messages.
    public _clientFrontDataLookup: Map<string, any>;

    public backChannels: any;

    readonly backMasterIndex;

    constructor(channelIds, backMasterIndex, messenger: Messenger) {
        super(backMasterIndex, messenger);
        this.backMasterIndex = backMasterIndex;
        this.backChannels = {};
        this.backChannelIds = [];
        this._clientFrontDataLookup = new Map();
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
     * @param patchData - patch data that is an encoded array with the channelId as the first element and the patch data as second.
     */
    public addStatePatch(frontMasterIndexes, patchData) { //patchData [ channelId, patch ]
        for(let i = 0; i < frontMasterIndexes.length; i++) {
            this._linkedFrontMasterChannels[frontMasterIndexes[i]].encodedPatches.push(patchData);
        }
    }

    /**
     * sends patch updates to the linked front masters, since the channelId (child channel id)
     * is present in the message, the front master will be able to correctly push the patched
     * states to the needed front channels.
     */
    public sendStatePatches() {
        for(let i = 0; i < this._linkedFrontMasterIndexesArray.length; i++) {
            const frontMasterIndex = this._linkedFrontMasterIndexesArray[i];
            const { encodedPatches } = this._linkedFrontMasterChannels[frontMasterIndex];

            this.push.PATCH_STATE[frontMasterIndex](msgpack.encode(encodedPatches)); // sends array of patches [ channelId, patch ]

            // clears patches
            encodedPatches.length = 0;
        }
    }

    /**
     * sends direct message to client from the back. Data of the client is kept in the _clientFrontDataLookup
     * and is updates when we handle new unlink/link publications from the front channel when the message
     * is supplied with a clientUid notifying that the link/unlink was for a client.
     * @param clientUid - uid of client to send direct message to
     * @param message - message client receives.
     * @returns {boolean}
     */
    public messageClient(clientUid, message) : boolean {
        if(this._clientFrontDataLookup.has(clientUid)) {
            // if the clientUid is discoverable in the lookup we forward message to the front master so it can relay it to the client.
            this.push.MESSAGE_CLIENT[this._clientFrontDataLookup.get(clientUid).frontMasterIndex]([clientUid, message]);
        }
        return false;
    }

    private handleNewFrontMasterConnection(frontMasterIndex) {
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
    public addedClientLink(clientUid, frontMasterIndex) {
        if(!(this._clientFrontDataLookup.has(clientUid))) {
            this._clientFrontDataLookup.set(clientUid, {
                linkCount: 1,
                frontMasterIndex: frontMasterIndex,
            });
        } else {
            this._clientFrontDataLookup.get(clientUid).linkCount++;
        }
    }

    /**
     * decrements the linkCount for given client and if it reaches 0
     * it is removed completely from the lookup.
     * @param clientUid
     */
    public removedClientLink(clientUid) {
        const clientData = this._clientFrontDataLookup.get(clientUid);

        if( (--clientData.linkCount) === 0) {
            this._clientFrontDataLookup.delete(clientUid);
        }
    }


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
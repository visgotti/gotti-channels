import * as msgpack from 'notepack.io';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import { MasterMessages, FrontMasterPushes, FrontMasterPulls } from './MasterMessages';

import FrontChannel from '../FrontChannel';
import { Channel } from '../../Channel/Channel';

export class FrontMasterChannel extends Channel {
    private pull: FrontMasterPulls;
    private push: FrontMasterPushes;

    private frontChannelIds: Array<string>;
    private _linkedBackMasterLookup: { linkedChannelsCount: number, queuedMessages: Array<any> };
    private _connectedBackMasters: Set<number>;

    public frontChannels: any;

    readonly frontMasterIndex;

    constructor(channelIds, totalChannels, frontMasterIndex, messenger: Messenger) {
        super(frontMasterIndex, messenger);
        this.frontMasterIndex = frontMasterIndex;

        this.frontChannels = {};
        this.frontChannelIds = [];

        this._linkedBackMasterLookup = {} as { linkedChannelsCount: number, queuedMessages: Array<any> };
        this._connectedBackMasters = new Set(); //todo make this a lookup similar to linked with count of connected channels.

        channelIds.forEach(channelId => {
            const frontChannel = new FrontChannel(channelId, totalChannels, messenger, this);
            this.frontChannels[channelId] = frontChannel;
            this.frontChannelIds.push(channelId);
        });

        this.initializeMessageFactories();
    }

    get connectedBackMasters() {
        return Array.from(this._connectedBackMasters.values());
    }

    public async connect() {
        try {
            let awaitingConnections = this.frontChannelIds.length;
            for(let i = 0; i < this.frontChannelIds.length; i++) {
                const connected  = await this.frontChannels[i].connect();
                // makes sure we connected to at least 1 back master index.
                if(connected && connected.backMasterIndexes.length) {
                    connected.backMasterIndexes.forEach(backMasterIndex => {
                        // registers pusher if the connected back master index wasnt registered yet.
                        this._connectedBackMasters.add(backMasterIndex);
                        this.push.SEND_QUEUED.register(backMasterIndex);
                    });
                    awaitingConnections--;
                    if(awaitingConnections === 0) {
                        return true;
                    }
                } else {
                    throw new Error('Error connecting.');
                }
            }
        } catch(err) {
            throw err;
        }
    }

    public sendQueuedMessages() {
        for(let key in this._linkedBackMasterLookup) {
            this.push.SEND_QUEUED[key](this._linkedBackMasterLookup[key].queuedMessages);
            this._linkedBackMasterLookup[key].queuedMessages.length = 0;
        }
    }

    /**
     * adds a message to the queue for a specific back Master Channel
     * @param message - message to send
     * @param backMasterIndex - server index that the linked back channel lives on.
     */
    public addQueuedMessage(message, backMasterIndex, channelId) {
        if(!(this._linkedBackMasterLookup[backMasterIndex])) {
            throw `The Back Master at index ${backMasterIndex} was not linked`;
        }
        this._linkedBackMasterLookup[backMasterIndex].queuedMessages.push([channelId, message]);
    }

    public unlinkChannel(backMasterIndex) {
        if( --(this._linkedBackMasterLookup[backMasterIndex].linkedChannelsCount) === 0) {
            this._linkedBackMasterLookup[backMasterIndex].queuedMessages.length = 0;
            delete this._linkedBackMasterLookup[backMasterIndex];
        }
    }

    public linkChannel(backMasterIndex) {
        if(!(this._linkedBackMasterLookup[backMasterIndex])) {
            this._linkedBackMasterLookup[backMasterIndex] = { linkedChannelsCount: 1, queuedMessages: [] }
        } else {
            this._linkedBackMasterLookup[backMasterIndex].linkedChannelsCount++;
        }
    }

    get linkedBackMasterLookup() {
        return this._linkedBackMasterLookup;
    }

    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories() {
        const { push, pull } = new MasterMessages(this.messenger);
        this.push = push;
        this.pull = pull;

        this.pull.PATCH_STATE.register(this.frontMasterIndex, (data) => { //[ channelId, patchData ]
            const decoded  = msgpack.decode(data);
            for(let i = 0; i < decoded.length; i++) {
                const channelId = decoded[i][0];
                const encodedPatch = decoded[i][1];
                this.frontChannels[channelId].patchState(encodedPatch);
            }
        })
    }

    public close() {
        for(let i = 0; i < this.frontChannelIds.length; i++) {
            this.frontChannels[this.frontChannelIds[i]].close();
        }
    }
}
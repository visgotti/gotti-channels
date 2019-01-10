import * as fossilDelta from 'fossil-delta';
import * as msgpack from 'notepack.io';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import { MasterMessages, FrontMasterPushes, FrontMasterPulls } from './MasterMessages';

import FrontChannel from '../FrontChannel';

export class FrontMasterChannel extends Channel {
    private pull: FrontMasterPulls;
    private push: FrontMasterPushes;

    private frontChannels: { channelId: string, channel: FrontChannel };
    private frontChannelIds: Array<string>;
    private statePatchesByFrontMasterIndex: { frontMasterIndex: number, encodedPatches: Array<any> };


    private linkedBackMasterLookup = {
        1: {
            "count": 3,
            queuedMessages: [ { channelId, message }],
        },
    };

    readonly frontMasterIndex;

    constructor(channelIds, frontMasterIndex, messenger: Messenger) {
        super(frontMasterIndex, messenger);

        this.frontMasterIndex = frontMasterIndex;

        channelIds.forEach(channelId => {
            const frontChannel = new FrontChannel(channelId, this, messenger);
            this.frontChannels[channelId] = frontChannel;
            this.frontChannelIds.push(channelId);
        });
    }

    public sendQueuedMessages() {
        for(let key in this.linkedBackMasterLookup) {
            this.push.SEND_QUEUED[key](this.linkedBackMasterLookup[key].queuedMessages);
            this.linkedBackMasterLookup[key].queuedMessages.length = 0;
        }
    }

    /**
     * adds a message to the queue for a specific back Master Channel
     * @param message - message to send
     * @param backMasterIndex - server index that the linked back channel lives on.
     */
    public addQueuedMessage(message, backMasterIndex, channelId) {
        this.linkedBackMasterLookup[backMasterIndex].queuedMessages.push([channelId, message]);
    }

    public unlinkChannel(backMasterIndex) {
        if( --(this.linkedBackMasterLookup[backMasterIndex].count) === 0) {
            this.linkedBackMasterLookup[key].queuedMessages.length = 0;
            delete this.linkedBackMasterLookup[backMasterIndex];
        }
    }

    public linkChannel(backMasterIndex) {
        if(!(this.linkedBackMasterLookup[backMasterIndex])) {
            this.linkedBackMasterLookup = { count: 1, queuedMessages: [] }
        } else {
            this.linkedBackMasterLookup.count++;
        }
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
                const channelId = decoded[0];
                const patch = decoded[1];
                this.frontChannels[channelId].patchState(patch);
            }
        })
    }
}
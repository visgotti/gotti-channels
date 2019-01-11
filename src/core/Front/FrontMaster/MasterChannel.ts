import * as msgpack from 'notepack.io';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import { MasterMessages, FrontMasterPushes, FrontMasterPulls } from './MasterMessages';

import FrontChannel from '../FrontChannel';
import { Channel } from '../../Channel/Channel';

export class FrontMasterChannel extends Channel {
    private pull: FrontMasterPulls;
    private push: FrontMasterPushes;

    private frontChannelIds: Array<string>;
    private linkedBackMasterLookup: { linkedChannelsCount: number, queuedMessages: Array<any> };

    public frontChannels: any;

    readonly frontMasterIndex;

    constructor(channelIds, totalChannels, frontMasterIndex, messenger: Messenger) {
        super(frontMasterIndex, messenger);
        this.frontMasterIndex = frontMasterIndex;

        this.frontChannels = {};
        this.frontChannelIds = [];
        this.linkedBackMasterLookup = {} as { linkedChannelsCount: number, queuedMessages: Array<any> };;

        channelIds.forEach(channelId => {
            const frontChannel = new FrontChannel(channelId, totalChannels, messenger, this);
            this.frontChannels[channelId] = frontChannel;
            this.frontChannelIds.push(channelId);
        });

        this.initializeMessageFactories();
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
        if( --(this.linkedBackMasterLookup[backMasterIndex].linkedChannelsCount) === 0) {
            this.linkedBackMasterLookup[backMasterIndex].queuedMessages.length = 0;
            delete this.linkedBackMasterLookup[backMasterIndex];
        }
    }

    public linkChannel(backMasterIndex) {
        if(!(this.linkedBackMasterLookup[backMasterIndex])) {
            this.linkedBackMasterLookup[backMasterIndex] = { linkedChannelsCount: 1, queuedMessages: [] }
        } else {
            this.linkedBackMasterLookup[backMasterIndex].linkedChannelsCount++;
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

    public async connect() {
        try {
            let awaitingConnections = this.frontChannelIds.length;
            for(let i = 0; i < this.frontChannelIds.length; i++) {
                const connected  = await this.frontChannels[i].connect();
                if(connected) {
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

    public close() {
        for(let i = 0; i < this.frontChannelIds.length; i++) {
            this.frontChannels[this.frontChannelIds[i]].close();
        }
    }
}
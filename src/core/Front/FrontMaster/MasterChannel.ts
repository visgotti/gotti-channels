import * as msgpack from 'notepack.io';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import { MasterMessages, FrontMasterPushes, FrontMasterSubs } from './MasterMessages';

import FrontChannel from '../FrontChannel';
import Client from '../../Client';
import { Channel } from '../../Channel/Channel';

export class FrontMasterChannel extends Channel {
    private sub: FrontMasterSubs;
    private push: FrontMasterPushes;

    private frontChannelIds: Array<string>;
    private _linkedBackMasterLookup: { linkedChannelsCount: number, queuedMessages: Array<any> };
    private _connectedBackMasters: Set<number>;
    private _connectedClients: any;

    public frontChannels: any;

    readonly frontMasterIndex;

    constructor(channelIds, totalChannels, frontMasterIndex, messenger: Messenger) {
        super(frontMasterIndex, messenger);
        this.frontMasterIndex = frontMasterIndex;

        this.frontChannels = {};
        this.frontChannelIds = [];

        this._linkedBackMasterLookup = {} as { linkedChannelsCount: number, queuedMessages: Array<any> };
        this._connectedBackMasters = new Set(); //todo make this a lookup similar to linked with count of connected channels.
        this._connectedClients = {};

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

    /**
     * Gets called in client when initialized
     * @param client
     */
    public clientConnected(client) {
        this._connectedClients[client.uid] = client;
    }

    /**
     * called in client when disconnect is called
     * @param uid
     * @returns {boolean}
     */
    public clientDisconnected(uid) : boolean {
        if(this._connectedClients[uid]) {
            delete this._connectedClients[uid];
            return true;
        }
        return false;
    }

    //TODO: this should iterate through an array not an object
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
        const { push, sub } = new MasterMessages(this.messenger, this.frontMasterIndex);
        this.push = push;
        this.sub = sub;

        this.sub.PATCH_STATE.register((data) => { //[ channelId, patchData ]
            const decoded  = msgpack.decode(data);
            for(let i = 0; i < decoded.length; i++) {
                const channelId = decoded[i][0];
                const encodedPatch = decoded[i][1];
                this.frontChannels[channelId].patchState(encodedPatch);
            }
        });

        this.sub.MESSAGE_CLIENT.register((data) => {
            const clientUid = data[0];
            const message = data[1];
            if(this._connectedClients[clientUid]) {
                this._connectedClients[clientUid].onMessageHandler(message);
            }
        });
    }

    public close() {
        for(let i = 0; i < this.frontChannelIds.length; i++) {
            this.frontChannels[this.frontChannelIds[i]].close();
        }
    }
}
import { STATE_UPDATE_TYPES } from './types';

import FrontChannel from './Front/FrontChannel';
import { FrontMasterChannel } from './Front/FrontMaster/MasterChannel';

class Client {
    readonly uid: string;
    public state: any;
    private masterChannel: FrontMasterChannel;
    private linkedChannels: Map<string, FrontChannel>;
    private processorChannel: FrontChannel;
    private _queuedEncodedUpdates: any;

    constructor(uid: string, masterChannel: FrontMasterChannel) {
        if(!(uid)) throw new Error('Invalid client uid.');
        this.uid = uid;
        this.masterChannel = masterChannel;
        this.masterChannel.clientConnected(this);
        this.processorChannel = null;
        this.linkedChannels = new Map();
        this._queuedEncodedUpdates = {};
        this.state = null;
    }

    get queuedEncodedUpdates() {
        return this._queuedEncodedUpdates;
    }

    /**
     * method to be overridden to handle direct client messages from back channels.
     */
    public onMessage(handler) {
        this.onMessageHandler = handler;
    }

    public onMessageHandler(message) { throw 'Unimplemented' };

    /**
     * Sets connected channel of client also links it.
     * @param channelId
     * @param options to send to back channel
     */
    public async linkChannel(channelId: string, options?: any) {
        try {
            const channel = this.masterChannel.frontChannels[channelId];
            if(!channel) throw new Error(`Invalid channelId ${channelId}`);
            const response = await channel.linkClient(this, options);
            this.linkedChannels.set(channelId, channel);
            this.addStateUpdate(channelId, response.encodedState, STATE_UPDATE_TYPES.SET);
            return response;
        } catch (err) {
            throw err;
        }
    }

    /**
     * this sets the channel where client messages get processed.
     * if the client isnt connected, it will call the connect method first.
     * @param channel
     * @param options to send to back channel
     */
    public async setProcessorChannel(channelId: string, options?: any) {
        try {
            const channel = this.masterChannel.frontChannels[channelId];
            if(!channel) throw new Error(`Invalid channelId${channelId}`);
            if(!(this.linkedChannels.has(channelId))) {
                await this.linkChannel(channelId, options);
                this.processorChannel = channel;
                return true;
            } else {
                this.processorChannel = channel;
                return true;
            }
        }
        catch (err) {
            throw err;
        }
    }

    public addStateUpdate(channelId, update, type: STATE_UPDATE_TYPES) {
        if(!(this.linkedChannels.has(channelId))) return false;

        if(!(channelId in this._queuedEncodedUpdates)) {
            this._queuedEncodedUpdates[channelId] = [];
        }
        this._queuedEncodedUpdates[channelId].push([channelId, type, update ]);

        return this._queuedEncodedUpdates[channelId].length;
    }

    public clearStateUpdates() {
        Object.keys(this._queuedEncodedUpdates).forEach(channelId => {
            this._queuedEncodedUpdates[channelId].length = 0;
        });
    }

    /**
     * Message that will be received by every server.
     * @param message
     */
    public sendGlobal(message) {
        if(!(this.processorChannel)) {
            throw new Error('Client must have a channel set as its processor channel to send messages. See Client.setProcessor');
        }

        const data = {
            clientUid: this.uid,
            message,
        };

        this.processorChannel.broadcast(data);
    }

    /**
     * sends message to back channel with processorId.
     * @param message
     */
    public sendLocal(message) {
        if(!(this.processorChannel)) {
            throw new Error('Client must have a channel set as its processor channel to send messages. See Client.setProcessor');
        }

        const data = {
            clientUid: this.uid,
            message,
        };

        this.processorChannel.addMessage(data);
    }

    public unlinkChannel(channelId?, options?) {
        if(this.linkedChannels.has(channelId)) {
            this.linkedChannels.get(channelId).unlinkClient(this.uid, options);
        } else {
            this.linkedChannels.forEach(channel => {
                channel.unlinkClient(this.uid);
            });
            this.masterChannel.clientDisconnected(this.uid)
        }
    }

    // removes queued updates from channel.
    public onChannelDisconnect(channelId) {
        if(this.processorChannel && this.processorChannel.channelId === channelId) {
            this.processorChannel = null;
        }
        delete this._queuedEncodedUpdates[channelId];
        this.linkedChannels.delete(channelId);
    }
}

export default Client;
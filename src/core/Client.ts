import { STATE_UPDATE_TYPES } from './types';

import FrontChannel from './Front/FrontChannel';
import { FrontMasterChannel } from './Front/FrontMaster/MasterChannel';

class Client {
    readonly uid: string;
    public state: any;
    private masterChannel: FrontMasterChannel;
    private connectedChannels: Map<string, FrontChannel>;
    private processorChannel: FrontChannel;
    private _queuedEncodedUpdates: any;

    constructor(uid: string, masterChannel: FrontMasterChannel) {
        this.uid = uid;
        this.masterChannel = masterChannel;
        this.masterChannel.clientConnected(this);
        this.processorChannel = null;
        this.connectedChannels = new Map();
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
     */
    public async connectToChannel(channelId: string) {
        try {
            const channel = this.masterChannel.frontChannels[channelId];
            const encodedState = await channel.connectClient(this);
            this.connectedChannels.set(channel.channelId, channel);
            this.addStateUpdate(channel.channelId, encodedState, STATE_UPDATE_TYPES.SET);
            return encodedState;
        } catch (err) {
            throw err;
        }
    }

    /**
     * this sets the channel where client messages get processed.
     * if the client isnt connected, it will call the connect method first.
     * @param channel
     */
    public async setProcessorChannel(channelId: string) {
        try {
            const channel = this.masterChannel.frontChannels[channelId];
            if(!channel) throw new Error('Invalid channelId');
            if(!(this.connectedChannels.has(channelId))) {
                await this.connectToChannel(channelId);
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
        if(!(this.connectedChannels.has(channelId))) return false;

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

    public disconnect(channelId?) {
        if(this.connectedChannels.has(channelId)) {
            this.connectedChannels.get(channelId).disconnectClient(this.uid)
        } else {
            this.connectedChannels.forEach(channel => {
                channel.disconnectClient(this.uid);
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
        this.connectedChannels.delete(channelId);
    }
}

export default Client;
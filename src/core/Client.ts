import * as fossilDelta from 'fossil-delta';
import * as msgpack from 'notepack.io';

import FrontChannel from './FrontChannel';

enum STATE_UPDATE_TYPES {
    SET,
    PATCH
}

interface StateUpdates {
    type: STATE_UPDATE_TYPES,
    encoded: string,
}

export class Client {
    readonly uid: string;
    public state: any;
    private connectedChannel: FrontChannel;
    private queuedEncodedUpdates: any;

    constructor(uid) {
        this.uid = uid;
        this.connectedChannel = null;

        this.queuedEncodedUpdates = {};

        this.state = null;
    }

    public addEncodedStateUpdate(channelId, stateUpdate: StateUpdates) {
        if(!(channelId in this.queuedEncodedUpdates)) {
            this.queuedEncodedUpdates[channelId] = [];
        }
        this.queuedEncodedUpdates[channelId].push(stateUpdate);
    }

    public clearEncodedStateUpdates() {
        Object.keys(this.queuedEncodedUpdates).forEach(key => {
            delete this.queuedEncodedUpdates[key];
        });
    }

    public addMessage(message) {
        if(!(this.connectChannel)) {
            throw new Error('Client must be connected to a channel to add messages.');
        }

        const data = {
            uid: this.uid,
            message,
        };

        this.connectedChannel.addMessage(data);
    }

    /**
     * Sets connected channel of client also links it.
     * @param channel
     */
    public connectChannel(channel: FrontChannel) {
        this.linkChannel(channel);
        this.connectedChannel = channel;
    }

    /**
     * adds linkage of client to a channel state.
     * @param channel
     */
    public linkChannel(channel: FrontChannel) {

    }

    /**
     * unlinks back channel updates for specific channel.
     * @param channelId
     */
    public unlinkChannel(channelId: string) {
        delete this.state[channelId];
    }

    public patchState() : any {
        const currentState = this.state;
        const currentStateEncoded = msgpack.encode( currentState );
        // skip if state has not changed.
        if ( currentStateEncoded.equals( this._previousStateEncoded ) ) {
            return false;
        }
        const patches = fossilDelta.create( this._previousStateEncoded, currentStateEncoded );
        this._previousStateEncoded = currentStateEncoded;
        return patches;
    }

    get previousStateEncoded() {
        return this._previousStateEncoded
    }
}
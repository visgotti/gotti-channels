import * as fossilDelta from 'fossil-delta';
import * as msgpack from 'notepack.io';

import { FrontChannel } from '../FrontChannel';
import { StateData } from '../types';
import { ClientState } from './ClientState';


export class Client {
    readonly uid: string;
    public state: any;
    private _previousState: any;
    private _previousStateEncoded: any;
f
    private connectedChannel: FrontChannel;

    constructor(uid) {
        this.uid = uid;
        this.connectedChannel = null;
        this.state = null;
        this._previousStateEncoded = {};
    }

    public addMessage()

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
        this.state[channel.id] = channel.state;
    }

    /**
     * unlinks back channel updates for specific channel.
     * @param channelId
     */
    public unlinkChannel(channelId: string) {
        delete this.linkedState[channelId];
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
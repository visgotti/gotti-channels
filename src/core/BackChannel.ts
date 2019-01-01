import * as fossilDelta from 'fossil-delta';
import * as msgpack from 'notepack.io';

import { Channel, ChannelType } from './Channel/Channel';

import { Centrum } from '../../lib/Centrum';

import { State, StateData } from './types';

export class BackChannel extends Channel {
    public broadcastState: Function;
    public broadcastPatch: Function;

    private _previousStateEncoded = any;

    constructor(id, centrum: Centrum) {
        super(id, centrum);
        this.initializeCentrumMessengers();
    }

    public onMessage(message: any) { throw new Error `Unimplimented onMessage for backChannel id${this.id}` };

    // back channels subscription can receive data that includes removed front states,
    // first we use this to remove states from the back before continuing to
    // process the updated front state.

    private initializeCentrumMessengers() {
        // front channels subscribe to back channel for JUST state data updates not removals since
        // the backState in a front channel just blindly takes shape each update from the sibling BackChannel
        const statePatchPubName = `statePatch${this.id}`;
        this.centrum.createPublish(statePatchPubName, this.broadcastStateHandler.bind(this));
        this.broadcastState = this.centrum.publish[statePatchPubName].bind(this);

        const stateSetPubName = `stateSet${this.id}`;
        this.centrum.createPublish(stateSetPubName, this.broadcastPatchHandler.bind(this));
        this.broadcastPatch = this.centrum.publish[stateSetPubName].bind(this);

        const forwardMessagesPubName = `${this.id}-forwardMessages`;
        this.centrum.createSubscription(forwardMessagesPubName, (data: any) => {
            for(let i = 0; i < data.messages.length; i++) {
            }
        });
    };

    private broadcastStateHandler() {
    }

    private broadcastPatchHandler() {
    }

    /**
     * Since the front server dictates what the backState has
     * the front channel will send a second parameter with
     * state removals so the back channel does not continue to process it.
     * @param callback
     */
    public onFrontStateUpdate(callback: (stateData: StateData) => void) {
        this._onStateUpdate = callback
    }

    public updateState(stateData: StateData, key: string) {
        this._updateState(stateData, key);
    }
    public removeState(key) {
        this._removeState(key);
    }
    public setState(state: State) {
        this._setState(state);
    }
}
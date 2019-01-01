import { Channel } from './Channel/Channel';
import { StateData } from './types';

import { Centrum } from '../../lib/Centrum';

export class FrontChannel extends Channel {
    public forwardMessages: Function;
    private queuedMessages: Array<any>;

    constructor(id, centrum: Centrum) {
        super(id, centrum);
        this.queuedMessages = [];
        this.initializeCentrumMessengers();
    }

    public addMessage(message) {
        this.queuedMessages.push(message);
    }

    public onSetState(stateData: StateData) {};
    public onPatchState(any: any) {};

    private initializeCentrumMessengers() {
        // front channels subscribe to back channel for JUST state data updates not removals since
        // the backState in a front channel just blindly takes shape each update from the sibling BackChannel
        const statePatchSubName = `statePatch${this.id}`;
        this.centrum.createSubscription(statePatchSubName, (patches: any) => {
            this._onStatePatch(patches);
        });

        const stateSetSubName = `stateSet${this.id}`;
        this.centrum.createSubscription(stateSetSubName, (stateData: StateData) => {
            this._onStateSet(stateData);
        });

        const forwardMessageName = `${this.id}-forwardMessages`;
        this.centrum.createPublish(forwardMessageName, this.forwardMessagesHandler.bind(this), this.clearQueuedMessages.bind(this));
        this.forwardMessages = this.centrum.publish[forwardMessageName].bind(this);
    };

    private forwardMessagesHandler() {
        if(this.queuedMessages.length > 0) {
            return this.queuedMessages;
        } else {
            return null;
        }
    }

    private clearQueuedMessages() {
        this.queuedMessages.length = 0;
    }

    private _onStatePatch(patches: any) {
        this.onPatchState(patches);
    }

    private _onStateSet(stateData: StateData) {
        this._setState(stateData);
        this.onSetState(stateData);
    }
}
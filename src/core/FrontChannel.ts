import { Channel, ChannelType } from './Channel/Channel';
import { ChannelState } from './Channel/ChannelState';
import { State, StateData } from './types';

import { Centrum } from '../../lib/Centrum';

export class FrontChannel extends Channel {
    public broadcastState: Function;

    private _backState: ChannelState;
    public removedStates: Array<string>;

    constructor(id, centrum: Centrum) {
        super(id, centrum, ChannelType.FRONT);
        this.removedStates = [];
        this._backState = new ChannelState();

        // front channels want to always store backState regardless of onBackStateUpdate
        // ever registering a callback.
        this._onStateUpdate = (stateData: StateData) => {
            this._backState.setState(stateData);
        };

        this.initializeCentrumMessengers();
    }

    /**
     * Function used to register a handler on Back Channel state updates.
     * @param callback
     */
    public onBackStateUpdate(callback: (stateData: StateData) => void) {
        this._onStateUpdate = (stateData: StateData) => {
            this._backState.setState(stateData);
            callback(stateData);
        }
    }

    get backState(): Object {
        return this._backState.state;
    }

    private initializeCentrumMessengers() {
        // front channels subscribe to back channel for JUST state data updates not removals since
        // the backState in a front channel just blindly takes shape each update from the sibling BackChannel
        this.centrum.createSubscription(this.subscribeStateName, (stateData: StateData) => {
            this._onStateUpdate(stateData);
        });

        this.centrum.createPublish(this.publishStateFunctionName, this.publishHandler.bind(this), this.clearRemovedStates.bind(this));
        this.broadcastState = this.centrum.publish[this.publishStateFunctionName];
    };

    private publishHandler() {
        if(this.removedStates.length === 0) {
            // if theres no removals just send over the state data
            return { stateData: this.getStateData() };
        } else {
            return {
                stateData: this.getStateData(),
                removedStates: this.removedStates
            }
        }
    }

    private clearRemovedStates() {
        this.removedStates.length = 0;
    }

    public removeState(key: string) {
        this._removeState(key);
        this.removedStates.push(key);
    }

    public setState(state: State) {
        this._setState(state);
    }

    public updateState(stateData: StateData, key: string) {
        this._updateState(stateData, key);
    }


}
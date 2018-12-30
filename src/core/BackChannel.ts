import { Channel, ChannelType } from './Channel/Channel';

import { Centrum } from '../../lib/Centrum';

import { State, StateData } from './types';

export class BackChannel extends Channel {
    public broadcastState: Function;

    constructor(id, centrum: Centrum) {
        super(id, centrum, ChannelType.BACK);
        this.initializeCentrumMessengers();
    }

    private initializeCentrumMessengers() {
        // back channels subscription can receive data that includes removed front states,
        // first we use this to remove states from the back before continuing to
        // process the updated front state.
        this.centrum.createSubscription(this.subscribeStateName, (receivedData: { stateData:  StateData, removedStates?: Array<string> }) => {
            if(receivedData.removedStates) {
                receivedData.removedStates.forEach(stateKey => {
                    this.removeState(stateKey);
                });
            }
            this._onStateUpdate(receivedData.stateData);
        });

        this.centrum.createPublish(this.publishStateFunctionName, this.getStateData.bind(this));
        this.broadcastState = this.centrum.publish[this.publishStateFunctionName];
    };

    /**
     * Since the front server dictates what the backState has
     * the front channel will send a second parameter with
     * state removals so the back channel does not continue to process it.
     * @param callback
     */
    public onFrontStateUpdate(callback: (stateData: StateData) => void) {
        this._onStateUpdate = callback
    }

    public removeState(key) {
        this._removeState(key);
    }
    public setState(state: State) {
        this._setState(state);
    }
    public updateState(stateData: StateData, key: string) {
        this._updateState(stateData, key);
    }
}
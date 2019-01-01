import { ChannelState } from './ChannelState';
import { StateData, StateDatum } from '../types';
import { Centrum } from '../../../lib/Centrum';

export enum ChannelType {
    BACK = "BACK",
    FRONT = "TYPE"
}

export class Channel {
    protected centrum: Centrum;

    protected _setState: Function;
    protected _patchState: Function;

    private channelState: ChannelState;

    constructor(id, centrum) {
        this.id = id;
        this.centrum = centrum;

        this.channelState = new ChannelState();

        // inherit all methods from state and make sure they stay bound to state object.
        this._setState = this.channelState.setState.bind(this.channelState);
        this._patchState = this.channelState.patchState.bind(this.channelState);
    }

    protected _onStateUpdate(stateData: StateData, removedStates?: Array<string>): void {
        throw new Error(`Unimplemented onStateUpdate handler in channel`);
    }

    public close() {
        this.centrum.close();
    }

}
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
    protected _updateState: Function;
    protected _removeState: Function;

    private channelState: ChannelState;
    readonly channelType: ChannelType;
    readonly publishStateFunctionName: string;
    readonly subscribeStateName: string;
    readonly id: string;

    constructor(id, centrum, channelType: ChannelType) {
        this.id = id;
        this.centrum = centrum;
        this.channelType === channelType;

        // depending on the type of channel it is, these will be inversed.
        // we want to subscribe to front if back, and subscribe to back if we're front.
        this.publishStateFunctionName = channelType === ChannelType.BACK ?
                                        ChannelType.BACK + this.id :
                                        ChannelType.FRONT + this.id;

        this.subscribeStateName = channelType === ChannelType.BACK ?
                                        ChannelType.FRONT + this.id :
                                        ChannelType.BACK + this.id;

        this.channelState = new ChannelState();

        // inherit all methods from state and make sure they stay bound to state object.
        this._setState = this.channelState.setState.bind(this.channelState);
        this._updateState = this.channelState.updateState.bind(this.channelState);
        this._removeState = this.channelState.removeState.bind(this.channelState);
    }

    protected getState() {
        return this.channelState.state;
    }

    protected getStateData() {
        const state = this.getState();
        return state.data;
    }

    protected _onStateUpdate(stateData: StateData, removedStates?: Array<string>): void {
        throw new Error(`Unimplemented onStateUpdate handler in channel`);
    }

    public close() {
        this.centrum.close();
    }

}
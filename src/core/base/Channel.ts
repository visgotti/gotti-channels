import { ChannelState, StateData } from './ChannelState';
import { Centrum } from '../../../lib/Centrum';

export enum ChannelType {
    BACK = "BACK",
    FRONT = "TYPE"
}

export class Channel {
    public broadcastState: Function;
    private state: ChannelState;
    private centrum: Centrum;
    readonly publishStateFunctionName: string;
    readonly subscribeStateName: string;
    readonly id: string;

    constructor(id, centrum, channelType: ChannelType) {
        this.id = id;
        this.centrum = centrum;

        // depending on the type of channel it is, these will be inversed.
        // we want to subscribe to front if back, and subscribe to back if we're front.
        this.publishStateFunctionName = channelType === ChannelType.BACK ?
                                        ChannelType.BACK + this.id :
                                        ChannelType.FRONT + this.id;

        this.subscribeStateName = channelType === ChannelType.BACK ?
                                        ChannelType.FRONT + this.id :
                                        ChannelType.BACK + this.id;

        this.state = new ChannelState();
        this.initializeCentrumMessengers();
    }

    private initializeCentrumMessengers() {
        // front channels subscribe to back channel for state updates.
        this.centrum.createSubscription(this.subscribeStateName, (state: StateData) => {
            this._onStateUpdate(state);
        });

        this.centrum.createPublish(this.publishStateFunctionName, this.getState.bind(this));
        this.broadcastState = this.centrum.publish[this.publishStateFunctionName];
    }

    protected _onStateUpdate(stateData: StateData): void {
        throw new Error(`Unimplemented onStateUpdate handler in channel`);
    }

    public setState(newState: StateData) {
        this.state.data = newState;
    }

    public getState() {
        return this.state.data;
    }
}
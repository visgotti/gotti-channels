import { StateData } from './ChannelState';
export declare enum ChannelType {
    BACK = "BACK",
    FRONT = "TYPE"
}
export declare class Channel {
    sendState: Function;
    private state;
    private centrum;
    readonly publishStateFunctionName: string;
    readonly subscribeStateName: string;
    readonly id: string;
    constructor(id: any, centrum: any, channelType: ChannelType);
    private initializeCentrumMessengers;
    protected _onStateUpdate(stateData: StateData): void;
    setState(newState: StateData): void;
    getState(): StateData;
}

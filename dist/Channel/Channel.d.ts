import { StateData } from '../types';
export declare enum ChannelType {
    BACK = "BACK",
    FRONT = "TYPE"
}
export declare class Channel {
    broadcastState: Function;
    private state;
    private centrum;
    readonly publishStateFunctionName: string;
    readonly subscribeStateName: string;
    readonly id: string;
    constructor(id: any, centrum: any, channelType: ChannelType);
    private initializeCentrumMessengers;
    protected _onStateUpdate(stateData: StateData): void;
    setState(newState: StateData, key?: string): void;
    removeState(key: string): void;
    getState(): StateData;
}
